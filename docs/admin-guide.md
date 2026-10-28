# Editorial guide

The console lives at `/admin`. Sign in with the account created by `pnpm db:seed`, then change the password from **Team**.

## Roles

| Role             | Can do                                                                                                           |
| ---------------- | ---------------------------------------------------------------------------------------------------------------- |
| `CONTENT_EDITOR` | Everything editorial: conversations, guests, topics, collections, transcripts, media, subscribers, site settings |
| `SUPER_ADMIN`    | All of the above, plus managing console accounts under **Team**                                                  |

Every create, update, status change and delete is written to the audit log on the **Overview** tab with the actor, action, entity and timestamp.

---

## Publishing a conversation

1. **Conversations → New conversation.**
2. Paste the **YouTube URL**. Any normal form works — `watch?v=`, `youtu.be/`, `/embed/`, `/shorts/`, or a bare 11-character ID. The video ID, thumbnail and embed are derived from it.
3. Add the **title**. The slug is generated automatically and made unique; override it only if you have a reason, because changing a published slug breaks existing links.
4. Write the **summary** (used on cards, in search results and in link previews) and the **description**.
5. Add **key takeaways**, one per line. Commas inside a takeaway are preserved.
6. Attach **guests**, **topics** and **collections**. A guest must exist before it can be attached.
7. Set the **duration** and, where it is known, the **published date**. Leave the date blank rather than guessing — the archive sorts unknown dates last instead of inventing a chronology.
8. Save as **Draft**, then move to **In review**, then **Published**. Only published conversations appear on the public site, in the sitemap or in Ask results.

### Editorial accuracy

Only record facts you can verify from the published video or from material the guest has made public. Where a biography or date is unknown, leave it empty; the site renders "Pending editorial review." rather than a fabricated line.

---

## Transcripts

A conversation becomes answerable by Ask the Archive only once it has a transcript. Open the conversation and use **Transcript**, then either upload a file or paste the text.

Three formats are accepted:

**WebVTT**

```
WEBVTT

00:00:05.000 --> 00:00:09.500
Rana Foroohar: The supply chain is the story.
```

**SRT**

```
1
00:00:01,000 --> 00:00:04,000
A sentence that wraps
across two lines.
```

**Plain text with leading timestamps**

```
[00:00:10] Lawrence: Welcome back.
[00:02:30] Guest: Thanks for having me.
```

Rules the parser applies:

- A `Name:` prefix is stored as the speaker and removed from the line.
- Wrapped cue lines are joined into one segment.
- Inline markup such as `<b>` is stripped.
- Out-of-order timestamps are re-sorted, and you are warned.
- A file with no readable timestamps is rejected rather than stored, because timestamps are what make "watch this moment" links work.

Uploading a transcript replaces any existing transcript for that episode and language.

---

## Guests, topics and collections

**Guests** carry a name, role, company, biography, headshot, website and expertise tags, and have their own draft/published status. A guest page only lists published conversations.

**Topics** are the filters on the archive and the "explore by idea" grid. Mark a topic **featured** to surface it on the homepage.

**Collections** are curated sequences — "start here", a themed run. Add a curator's note explaining why the conversations belong together. Membership is set from the conversation editor, not the collection form, so editing a collection's copy never disturbs its running order.

---

## Media

**Media** holds headshots, cover images and downloadable PDFs. Always write alt text for images; it is read by screen readers and used when an image fails to load. Copy the returned URL into the relevant guest, episode or lead-magnet field.

The upload size limit is `STORAGE_MAX_UPLOAD_MB` (25 MB by default).

---

## Subscribers and lead magnets

**Lead magnets** are the resources offered in exchange for an email. Only one is offered at a time — the active one. Set the file URL (upload it under Media first), a title and a description.

**Subscribers** lists everyone who submitted the form, with the resource they requested and whether they consented. **Export CSV** downloads the list for your email platform.

Notes on the data:

- Consent is explicit and required; the form cannot be submitted without it.
- A repeat submission of the same email for the same resource does not create a duplicate, and the visitor still receives the download.
- A hidden honeypot field silently discards bot submissions.
- Treat the export as personal data: keep it inside your email platform and delete local copies.

---

## Site settings

**Site settings** controls copy that used to be hardcoded: the site title and tagline, hero text and image, host name, role, portrait, short and long biography and pull quote, newsletter heading and body, the meta description, and the YouTube playlist link.

The **Ask the Archive** section holds the suggested questions shown as prompt chips, one per line, up to twelve. Good suggestions are specific and answerable from the archive — "What did Rana Foroohar say about supply chains?" works better than "Tell me about the economy."
