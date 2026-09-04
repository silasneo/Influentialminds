# Influential Minds

A premium editorial video podcast and knowledge-discovery prototype for Influential Minds, hosted by Dr. Lawrence E. Jones. The frontend is built with React, Vite, Tailwind CSS and the editorial “Marginalia Room” design system.

## Local development

```bash
pnpm install
pnpm dev
```

## GitHub Pages

The site is configured for the repository path `/Influentialminds/`. The included workflow builds the Vite frontend with that base path and packages `dist/public` as a Pages artifact. Local visual assets are stored in `client/public/assets`, while episode thumbnails use the verified YouTube image endpoint and episode links point to the corresponding YouTube videos.

After the repository is updated, enable GitHub Pages in **Settings → Pages**, select **GitHub Actions** as the source, and run the Pages workflow from the **Actions** tab. The expected project URL is:

`https://silasneo.github.io/Influentialminds/`

For production content updates, replace the prototype’s `latestEpisodes` array with CMS or YouTube Data API ingestion. Store the video ID, title, guest, duration, published date, thumbnail URL, playlist URL, topics and transcript status as structured episode metadata; do not scrape YouTube from the browser.

## Content included

The current prototype includes the supplied Dr. Lawrence Jones hero treatment, real playlist-backed entries for Ann Christine Duhaime, Jesper Brodin and Rana Foroohar, the simulated Ask the Archive state, idea discovery, people discovery, collections and newsletter capture UI.
