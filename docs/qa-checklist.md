# QA checklist

Run before each release. Automated checks first — they are fast and catch most regressions — then the manual passes, which cover what a test suite cannot.

## Automated

```bash
pnpm install --frozen-lockfile
pnpm db:generate
pnpm check      # typecheck + lint, all packages
pnpm test       # API unit tests
pnpm build      # contracts, API, web
```

All four must pass with no errors. CI runs the same commands, plus a migrations job that applies the committed migrations to a real MySQL 8 instance and asserts they still reproduce `schema.prisma`.

## Content

- [ ] Every published conversation has a title, summary, YouTube URL, duration and at least one topic.
- [ ] Every published conversation has a transcript, or is knowingly excluded from Ask.
- [ ] No placeholder text ("Lorem", "TODO", "Pending editorial review.") is visible on a published page.
- [ ] Guest names, roles and affiliations match the source material. Unknown facts are left blank, not guessed.
- [ ] Published dates are either correct or empty.
- [ ] Featured episode and featured topics are the intended ones.

## Public site

- [ ] Homepage renders: hero, featured conversation, latest conversations, topics, guests, collections, host section, newsletter.
- [ ] `/archive` loads; search, topic, guest and collection filters each narrow the results; pagination works and filters survive it.
- [ ] An episode page shows the embed, summary, takeaways, guests, topics and related conversations.
- [ ] The YouTube embed plays, and transcript moment links open at the right timestamp.
- [ ] Guest, topic and collection pages list only published conversations.
- [ ] A bad slug returns the 404 page, not a crash or an empty shell.
- [ ] The newsletter form accepts a valid submission, rejects a missing consent box, and handles a repeat email without an error.
- [ ] The lead magnet download link works.

## Ask the Archive

- [ ] A question with good archive coverage returns an answer with sources.
- [ ] Every source links to the correct moment in the correct video.
- [ ] A question the archive does not cover returns an honest "no coverage" answer, not an invented one.
- [ ] Exceeding the daily limit shows the quota message, not a raw error.
- [ ] With `AI_PROVIDER=disabled`, the sources-only fallback renders sensibly.

## Admin

- [ ] Sign-in works; a wrong password is rejected with a clear message.
- [ ] An expired or missing session redirects to `/admin` instead of showing a broken console.
- [ ] Create, edit and delete work for conversations, guests, topics, collections, lead magnets and media.
- [ ] Draft → In review → Published moves the conversation on and off the public site.
- [ ] Editing a collection's description does not empty its episode list.
- [ ] Transcript upload accepts WebVTT, SRT and bracketed plain text, and rejects a file with no timestamps.
- [ ] Media upload returns a working URL; oversized files are rejected cleanly.
- [ ] Subscriber CSV export opens correctly in a spreadsheet.
- [ ] A `CONTENT_EDITOR` cannot see or reach the Team tab.
- [ ] Recent actions appear in the audit log.
- [ ] `/admin` and `/admin/dashboard` are `noindex`.

## Accessibility

- [ ] Tab from the top of the page reveals the skip link, and it jumps to the main content.
- [ ] Every interactive element is reachable by keyboard, in a sensible order.
- [ ] The focus ring is visible on every focusable element, including against dark sections.
- [ ] Dialogs and menus trap focus and close on `Escape`.
- [ ] Every image has alt text; decorative images have empty alt.
- [ ] Headings descend in order, with one `h1` per page.
- [ ] Form fields have real labels, and errors are announced, not only coloured.
- [ ] Body text meets 4.5:1 contrast; large text meets 3:1.
- [ ] The site is usable at 200% zoom and at 320 px width.
- [ ] `prefers-reduced-motion` suppresses non-essential animation.
- [ ] A screen-reader pass of the homepage and one episode page is coherent.

## SEO and metadata

- [ ] Each page has a unique title and meta description.
- [ ] Canonical URLs use `NEXT_PUBLIC_SITE_URL` and are absolute.
- [ ] Open Graph and Twitter cards preview correctly.
- [ ] JSON-LD validates: `Organization` and `WebSite` on the homepage, `PodcastEpisode`/`VideoObject` on episodes, `Person` on guests, `BreadcrumbList` where used.
- [ ] `/sitemap.xml` lists every published episode, guest, topic and collection, and no drafts.
- [ ] `/robots.txt` allows the public site and disallows `/admin`.

## Resilience and performance

- [ ] With JavaScript disabled, the homepage, archive and episode pages still render and their links work. Ask and the admin console are expected to need JavaScript.
- [ ] With the API stopped, pages fail gracefully rather than showing a stack trace.
- [ ] Lighthouse on homepage, archive and an episode page: performance, accessibility, best practices and SEO all ≥ 90.
- [ ] Layout holds at 320 px, 768 px, 1024 px and 1440 px.
- [ ] Fonts load without a flash of invisible text.

## Security

- [ ] The admin session cookie is `HttpOnly`, `Secure` and `SameSite`-scoped in production.
- [ ] `CORS_ORIGINS` lists only the real site origin.
- [ ] `AUTH_SECRET` and `IP_HASH_SALT` are unique to the environment and absent from the repository.
- [ ] No `.env` file is committed.
- [ ] Admin endpoints return `401` when called without a session.
- [ ] Uploads are size-limited and type-checked.
