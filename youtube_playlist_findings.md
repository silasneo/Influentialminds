# YouTube playlist findings

Source: [Influential Minds playlist](https://www.youtube.com/playlist?list=PLaqXzRqTnPvCncnQM6zvC2vafHKg9a_bV), inspected 4 September 2026.

The playlist page identifies the channel as EEI International and shows 31 episodes. Verified visible entries include:

| Playlist position | Episode title | Duration | Video ID | Thumbnail pattern |
|---|---|---:|---|---|
| 1 | Influential Minds: A Conversation with Rana Foroohar | 46:30 | cughCiJVw1E | https://i.ytimg.com/vi/cughCiJVw1E/hqdefault.jpg |
| 2 | Influential Minds: A Conversation with Harmeet Sawhney | 1:08:50 | tA-Yt0Ji6R0 | https://i.ytimg.com/vi/tA-Yt0Ji6R0/hqdefault.jpg |
| 3 | Influential Minds: A Conversation with Steven, Bob, and Jay Novella | 59:00 | LvUy5EekZNc | https://i.ytimg.com/vi/LvUy5EekZNc/hqdefault.jpg |
| 4 | Influential Minds: A Conversation with Jennifer Sciubba | 1:02:24 | X8I8IvY_JHA | https://i.ytimg.com/vi/X8I8IvY_JHA/hqdefault.jpg |
| 5 | Influential Minds: A Conversation with Steve Hamm | 1:01:33 | MeRNbk-f4ZY | https://i.ytimg.com/vi/MeRNbk-f4ZY/hqdefault.jpg |
| 6 | Influential Minds: A Conversation with Michael Spence | 1:11:02 | ACqnpVmmRFo | https://i.ytimg.com/vi/ACqnpVmmRFo/hqdefault.jpg |
| 7 | Influential Minds: A Conversation with Sebastian Mallaby | 55:53 | Kjgv_MY2OzE | https://i.ytimg.com/vi/Kjgv_MY2OzE/hqdefault.jpg |
| 8 | Influential Minds: A Conversation with Julio M. Ottino | 1:01:44 | qcjQK7-wovg | https://i.ytimg.com/vi/qcjQK7-wovg/hqdefault.jpg |

The page's extracted markdown also surfaced the requested title “Influential Minds: A Conversation with Ann Christine Duhaime” and a later entry beginning with a 55:35 duration, but the first browser extraction did not expose its complete href/video ID. The next step is to parse the saved playlist HTML for exact IDs for Ann Christine Duhaime and Jesper Brodin before wiring them into the UI.

Recommended implementation approach: keep episode metadata in one typed array/object with `title`, `guest`, `videoId`, `thumbnailUrl`, `duration`, `playlistUrl`, `topics`, and `status`. For production, use YouTube Data API/CMS ingestion rather than scraping the playlist in the browser. For this static prototype, use verified `i.ytimg.com` thumbnail URLs and deep links to the playlist/video.

## Requested episode metadata verified from playlist HTML

| Episode title | Video ID | Thumbnail URL | Playlist entry |
|---|---|---|---|
| Influential Minds: A Conversation with Ann Christine Duhaime | `vPJhbI81jSw` | https://i.ytimg.com/vi/vPJhbI81jSw/hqdefault.jpg | Playlist index 16 |
| Influential Minds: A Conversation with Jesper Brodin | `S2nj2IKXE4Y` | https://i.ytimg.com/vi/S2nj2IKXE4Y/hqdefault.jpg | Playlist index 12 |

Use the canonical thumbnail form `https://i.ytimg.com/vi/{videoId}/hqdefault.jpg` in the prototype. For production, the preferred path is YouTube Data API or CMS ingestion that stores the video ID, title, duration, published date, thumbnail URL, guest relationship and topic taxonomy as episode metadata; the browser should not scrape YouTube directly.
