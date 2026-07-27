# THE SYSTEM — Physique Ascension Tracker

A Solo Leveling-style workout, quest, and nutrition tracker. Log sets with weight/reps,
see your previous session's numbers inline, track meals with auto-calculated macros,
and level up your hunter stats as you train.

## Run locally

```bash
npm install
npm run dev
```

Opens at `http://localhost:5173`.

## Deploy to Netlify

### Option A — drag and drop
1. Run `npm install && npm run build` locally (or let Netlify do it — see Option B).
2. Drag the generated `dist` folder onto https://app.netlify.com/drop

### Option B — connect a Git repo (recommended, gives you auto-deploys)
1. Push this folder to a GitHub/GitLab repo.
2. In Netlify: **Add new site → Import an existing project**.
3. Netlify will auto-detect the settings from `netlify.toml`:
   - Build command: `npm run build`
   - Publish directory: `dist`
4. Click **Deploy**.

## Notes on data storage

This app stores all your data (workouts, meals, XP, routine edits) in your browser's
`localStorage`. That means:
- Your data stays on the device/browser you use it in — it does not sync across devices.
- Clearing your browser's site data will erase your progress.
- There's no backend, no login, and no data leaves your browser.

If you later want cross-device sync, that requires adding a real backend (e.g. Supabase
or Firebase) — happy to help wire that in when you're ready.

## Notifications

Browser push notifications require you to grant permission (you'll get a prompt on first
load) and work best when the app is installed to your home screen ("Add to Home Screen"
from your mobile browser's share/menu button), since that runs it in standalone app mode.

## Project structure

```
├── index.html          # Entry HTML, PWA manifest links
├── package.json
├── vite.config.js
├── netlify.toml         # Netlify build settings
├── public/
│   ├── manifest.json    # PWA manifest (installable "app")
│   ├── icon-192.png
│   └── icon-512.png
└── src/
    ├── main.jsx         # React root mount
    └── App.jsx          # The entire System app (UI, state, storage, food DB)
```
