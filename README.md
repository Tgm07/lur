# Lyric Stage browser prototype

Run `npm start` in this folder and open http://127.0.0.1:8787.

Requires Node 22+ and yt-dlp. The server uses the existing local yt-dlp executable; set YTDLP_PATH to override its location. It binds only to this computer. Search uses the app's public YouTube Music song-search approach, without copying account credentials into browser code. No Google login or personalized feed is included in this prototype.

Songs are cached locally after downloading. Existing Android bridge audio caches can also be played. YouTube may reject some downloads; the player reports this and lets you choose another song. Lyrics come from LRCLIB when a matching recording is available. Browser storage remembers the last song and position; press Play to resume after reopening.

Design: a listening tool, with search first, a circular vinyl record, transport controls, and adjacent results/lyrics. Black/burgundy palette follows the Android app. Desktop and narrow layouts; reduced-motion support; keyboard-accessible native controls. No account permission is required because this prototype does not access private account data.
