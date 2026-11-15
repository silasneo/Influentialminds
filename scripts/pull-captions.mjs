#!/usr/bin/env node
/**
 * Pulls YouTube auto-captions for published episodes and uploads them to the
 * admin transcript endpoint, which parses and indexes them for Ask the Archive.
 *
 * Requires yt-dlp on PATH (or `python -m yt_dlp`, or $YT_DLP).
 *
 *   node scripts/pull-captions.mjs --dry-run
 *   node scripts/pull-captions.mjs --only conversation-with-rana-foroohar
 *   node scripts/pull-captions.mjs
 *
 * Uploading replaces any existing transcript for the episode and language, so
 * re-running is safe and idempotent.
 *
 * Captions are machine-generated: unpunctuated, no speaker labels, and
 * sometimes wrong on proper nouns. They are a usable starting point for search,
 * not publishable text. Uploading a cleaned transcript later replaces them.
 */
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const args = process.argv.slice(2);
const flag = name => args.includes(`--${name}`);
const value = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
};

const API = value("api", process.env.API_URL ?? "http://localhost:4000");
const EMAIL = value("email", process.env.ADMIN_EMAIL ?? "");
const PASSWORD = value("password", process.env.ADMIN_PASSWORD ?? "");
const LANG = value("lang", "en");
const ONLY = value("only", null);
const DRY_RUN = flag("dry-run");

if (!EMAIL || !PASSWORD) {
  console.error(
    "Set ADMIN_EMAIL and ADMIN_PASSWORD (or pass --email / --password)."
  );
  process.exit(1);
}

/** yt-dlp may be a binary on PATH or a module in the active Python. */
function resolveYtDlp() {
  const candidates = [
    process.env.YT_DLP ? [process.env.YT_DLP, []] : null,
    ["yt-dlp", []],
    ["python", ["-m", "yt_dlp"]],
    ["python3", ["-m", "yt_dlp"]],
  ].filter(Boolean);

  for (const [cmd, prefix] of candidates) {
    const probe = spawnSync(cmd, [...prefix, "--version"], {
      encoding: "utf8",
      shell: process.platform === "win32",
    });
    if (probe.status === 0)
      return { cmd, prefix, version: probe.stdout.trim() };
  }
  return null;
}

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Downloading captions blocks the event loop for long enough that an idle
 * keep-alive socket can be closed by the server before the next request is
 * written to it, which surfaces as a bare "fetch failed". Retry transport
 * errors; HTTP responses are returned untouched so real failures still fail.
 */
async function request(url, init, attempts = 3) {
  for (let attempt = 1; ; attempt += 1) {
    try {
      return await fetch(url, init);
    } catch (error) {
      if (attempt >= attempts) {
        const cause = error.cause?.code ?? error.cause?.message;
        throw new Error(
          `${error.message}${cause ? ` (${cause})` : ""} after ${attempt} attempts`
        );
      }
      await sleep(250 * attempt);
    }
  }
}

async function login() {
  const res = await request(`${API}/api/v1/admin/auth/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
  });
  if (!res.ok) throw new Error(`Login failed (${res.status}).`);
  const cookie = (res.headers.getSetCookie?.() ?? [])
    .map(c => c.split(";")[0])
    .join("; ");
  if (!cookie) {
    throw new Error("Login succeeded but returned no session cookie.");
  }
  return cookie;
}

async function listEpisodes(cookie) {
  const res = await request(`${API}/api/v1/admin/episodes?pageSize=200`, {
    headers: { cookie },
  });
  if (!res.ok) throw new Error(`Could not list episodes (${res.status}).`);
  const body = await res.json();
  return (body.items ?? []).filter(episode => episode.youtubeVideoId);
}

function downloadCaptions(ytdlp, videoId, dir) {
  const result = spawnSync(
    ytdlp.cmd,
    [
      ...ytdlp.prefix,
      "--write-auto-subs",
      // en-orig is the original ASR track; en is YouTube's cleaned variant.
      "--sub-langs",
      "en-orig,en",
      "--sub-format",
      "srt/vtt",
      "--convert-subs",
      "srt",
      "--skip-download",
      "--no-warnings",
      "-o",
      join(dir, "%(id)s.%(ext)s"),
      `https://www.youtube.com/watch?v=${videoId}`,
    ],
    { encoding: "utf8", shell: process.platform === "win32" }
  );
  if (result.status !== 0) return null;

  const files = readdirSync(dir).filter(file => file.endsWith(".srt"));
  // Prefer the original track; it is closer to what was actually said.
  const chosen =
    files.find(file => file.includes(".en-orig.")) ??
    files.find(file => file.includes(".en.")) ??
    files[0];
  return chosen
    ? { name: chosen, content: readFileSync(join(dir, chosen), "utf8") }
    : null;
}

async function upload(cookie, episodeId, sourceFileName, content) {
  const res = await request(
    `${API}/api/v1/admin/episodes/${episodeId}/transcript`,
    {
      method: "POST",
      headers: { "content-type": "application/json", cookie },
      body: JSON.stringify({ language: LANG, sourceFileName, content }),
    }
  );
  const body = await res.json().catch(() => ({}));
  if (!res.ok)
    throw new Error(body.message ?? `Upload failed (${res.status}).`);
  return body;
}

async function main() {
  const ytdlp = resolveYtDlp();
  if (!ytdlp) {
    console.error(
      "yt-dlp was not found. Install it with `pip install yt-dlp`, or set $YT_DLP."
    );
    process.exit(1);
  }
  console.log(`yt-dlp ${ytdlp.version}  ->  ${API}`);

  const cookie = await login();
  let episodes = await listEpisodes(cookie);
  if (ONLY) {
    episodes = episodes.filter(
      episode => episode.slug === ONLY || episode.id === ONLY
    );
  }
  if (episodes.length === 0) {
    console.error("No matching episodes with a YouTube video id.");
    process.exit(1);
  }

  let indexed = 0;
  let failed = 0;
  for (const episode of episodes) {
    const label = `${episode.slug} (${episode.youtubeVideoId})`;
    const dir = mkdtempSync(join(tmpdir(), "im-captions-"));
    try {
      const captions = downloadCaptions(ytdlp, episode.youtubeVideoId, dir);
      if (!captions) {
        console.log(`  no subs  ${label}`);
        failed += 1;
        continue;
      }
      if (DRY_RUN) {
        const cues = (captions.content.match(/-->/g) ?? []).length;
        console.log(`  dry-run  ${label} — ${cues} cues in ${captions.name}`);
        continue;
      }
      const result = await upload(
        cookie,
        episode.id,
        captions.name,
        captions.content
      );
      console.log(`  indexed  ${label} — ${result.segmentCount} segments`);
      indexed += 1;
    } catch (error) {
      console.log(`  FAILED   ${label} — ${error.message}`);
      failed += 1;
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  }

  console.log(
    `\n${indexed} indexed, ${failed} failed, ${episodes.length} considered.`
  );
  if (failed > 0) process.exitCode = 1;
}

main().catch(error => {
  console.error(error.message);
  process.exit(1);
});
