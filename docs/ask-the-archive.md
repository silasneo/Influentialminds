# Ask the Archive

Ask the Archive answers questions using only what was actually said in the conversations. It is retrieval-grounded: the archive supplies the evidence, and the language model only writes the prose around it.

## How a question is answered

1. **Retrieve.** The question is matched against transcript segments of published episodes. Each segment keeps its start time, speaker and episode.
2. **Score and filter.** Segments below `AI_MIN_SCORE` (default `0.12`) are discarded. If nothing clears the threshold, the API returns an honest "nothing in the archive covers this" answer rather than guessing.
3. **Select.** The top `AI_MAX_SOURCES` segments (default `5`) become the sources.
4. **Compose.** The provider is given the question and those segments, and is instructed to answer only from them.
5. **Return.** The answer ships with its sources, each carrying the episode title and slug, the speaker, the quoted passage, a `timecode`, and a `momentUrl` — a YouTube link with the exact `?t=` offset so a visitor can watch the claim being made.

Because every source is a retrieval record rather than something the model produced, a citation cannot be hallucinated. The worst failure mode is a weak answer, not a fabricated one.

**An episode is only answerable once it has a transcript.** A published conversation with no transcript is invisible to Ask. See [admin-guide.md](admin-guide.md#transcripts).

## Modes

`AI_PROVIDER` selects the mode, and every response reports which one served it.

| `AI_PROVIDER` | `mode`     | Behaviour                                                                                                                                                                                                             |
| ------------- | ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `disabled`    | `disabled` | Retrieval still runs and sources are returned, but no prose is generated. The UI presents the matching moments as a reading list. This is the default, so a fresh deployment degrades gracefully instead of erroring. |
| `mock`        | `mock`     | Deterministic locally-composed answer built from the retrieved segments. Use it for development and demos — no API key, no cost, no network.                                                                          |
| `mindstudio`  | `live`     | Calls MindStudio. Requires `AI_PROVIDER_API_KEY`; the API refuses to boot without it.                                                                                                                                 |

Live mode settings: `AI_PROVIDER_BASE_URL`, `AI_PROVIDER_AGENT_ID`, `AI_PROVIDER_TIMEOUT_MS` (default 25 s). If the provider times out or fails, the request falls back to returning the retrieved sources rather than failing outright.

## Quotas

Limits are per day, defined in `packages/contracts/src/ask.ts` rather than in environment variables, so the public site and the API never disagree about what a visitor is entitled to.

| Tier         | Questions per day |
| ------------ | ----------------- |
| `ANONYMOUS`  | 2                 |
| `REGISTERED` | 10                |
| `SUBSCRIBER` | unlimited         |

Only the anonymous tier is reachable today — visitor accounts are V2 work, and the higher tiers are modelled in advance so adding them later is a data change rather than a redesign.

Anonymous callers are identified by a salted hash of their IP address, keyed by day. The salt is `IP_HASH_SALT`; raw addresses are never stored. Changing the salt resets everyone's count.

`GET /ask/usage` returns the caller's remaining questions, so the UI can show the allowance before the question is asked rather than rejecting it afterwards.

## Status codes

| Code  | Meaning                    | What the UI does                                                                    |
| ----- | -------------------------- | ----------------------------------------------------------------------------------- |
| `200` | Answered                   | Renders the answer and its sources                                                  |
| `400` | Question empty or too long | Inline validation message                                                           |
| `429` | Daily quota exhausted      | Explains the limit and when it resets, and points to the archive and the newsletter |
| `503` | Provider unavailable       | Shows retrieved sources with a note that the written answer is unavailable          |

## Logging

Each question is recorded with its tier, matched episode count, mode and latency. Nothing that identifies the visitor is stored beyond the salted daily hash used for counting. The log answers "what are people asking the archive?", which is an editorial signal worth having — it shows which subjects deserve another conversation.

## Tuning

- Answers too thin, or too many "nothing covers this" responses: lower `AI_MIN_SCORE` or raise `AI_MAX_SOURCES`.
- Answers drifting onto loosely related material: raise `AI_MIN_SCORE`.
- Consistently poor results on a subject: the most likely cause is a missing transcript, not a tuning problem. Check coverage first.
