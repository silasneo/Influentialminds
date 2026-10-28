# Legacy prototype

The HTML from the original Influential Minds prototype, kept for reference after
the site was rebuilt as the Next.js + NestJS application in `apps/`.

| File                   | What it is                                                                                                                                |
| ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `index.html`           | The Vite entry template from the old `client/` directory. It is a shell that mounted a React bundle; it does nothing on its own.          |
| `prototype/index.html` | The built single-page mockup, with its CSS and JavaScript inlined. Opening it in a browser shows the original design as it was presented. |

`prototype/index.html` references images at `/assets/...`. Those files now live in
`apps/web/public/assets/`, so the images resolve when the file is served from the
running site's origin, and appear broken when the file is opened directly from
disk. The markup, layout and copy are unaffected either way.

## Why it is here rather than deleted

The prototype is the reference for what the design looked like when it was
signed off, and the only record of several editorial decisions that predate the
database. It is not built, tested, linted or deployed, and nothing in `apps/`
imports from it.

## What replaced it

Everything the prototype faked is now real:

| Prototype                                 | Now                                                                    |
| ----------------------------------------- | ---------------------------------------------------------------------- |
| Episodes and guests in static arrays      | MySQL records edited in the admin console                              |
| `alert()` in place of navigation          | Real routes for episodes, guests, topics and collections               |
| A simulated AI search with canned results | Ask the Archive, answering from transcripts with timestamped citations |
| A newsletter form that did nothing        | Lead capture with consent, storage and CSV export                      |
| One page                                  | A full public site, a CMS and an API                                   |
