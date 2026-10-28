# Roadmap

What this MVP deliberately leaves out, and why. Everything here is modelled or stubbed in a way that makes it an addition later rather than a rewrite.

## Deferred to V2

### Visitor accounts

The Ask quota already distinguishes `ANONYMOUS`, `REGISTERED` and `SUBSCRIBER` tiers, but only the anonymous tier is reachable. Adding accounts means a sign-up flow, verification, a session for visitors (separate from the admin session) and a small account page. The quota logic itself needs no change.

### Richer search

Archive search is a straightforward database match across titles, summaries and descriptions. It is predictable and fast at the current archive size. Worth revisiting when the archive is large enough that relevance ranking matters: full-text indexing, typo tolerance, facet counts, or semantic search over the same transcript embeddings Ask already uses.

### Scheduled publishing

Status changes are manual. A `publishAt` field plus a worker that promotes `IN_REVIEW` to `PUBLISHED` at the right moment would let the editor queue a season in advance.

### Image pipeline

Images are served as uploaded. A pipeline producing resized, `webp`/`avif` variants with blur placeholders would cut page weight meaningfully, especially on guest grids.

### Analytics

No analytics are installed, and no third-party scripts run on the public site. When this is added, prefer a privacy-respecting, cookieless provider so no consent banner is needed. The Ask query log already answers the most editorially useful question — what people want to know — without any external service.

### YouTube sync

Episode metadata is entered by hand. A periodic sync against the playlist could pull in new uploads as drafts with their title, duration, thumbnail and published date pre-filled, leaving the editorial work (summary, takeaways, guests, topics) to a human. Automatic captions could seed transcripts, subject to review.

### Email automation

Subscribers are exported as CSV for an external platform. Direct integration — a provider API, double opt-in, automatic delivery of the lead magnet — removes the manual step.

### Multi-language transcripts

The schema already keys transcripts by `episodeId` and `language`, so a second language is storable today. What is missing is a language switcher in the UI and language-aware retrieval in Ask.

## Considered and rejected

- **A headless CMS.** The content model is specific — transcript segments with timestamps feeding retrieval — and a generic CMS would have fought it.
- **Static generation of every episode page.** It would couple builds to database availability for little gain at this scale. On-demand rendering with a shared data cache is simpler and keeps CI infrastructure-free.
- **A single combined deployment.** Separate web and API deployments let the site scale independently of the database and keep the media volume off the frontend host.
- **Tailwind in the new frontend.** The design system is a small, deliberate set of editorial tokens and components; hand-written CSS expresses it more clearly than utility classes and keeps the markup readable.
