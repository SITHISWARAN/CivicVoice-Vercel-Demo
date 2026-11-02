# CivicVoice — Vercel demo-only patch

This patch changes the hosted version to be completely stateless:

- No SQLite / PostgreSQL / database
- No server-side memory or persistence
- Existing records come only from `server/demo-data.js`
- New complaints are returned only in the current request and displayed in the browser
- Status editing is disabled on the hosted demo
- GNANI STT and TTS remain server-side behind `GNANI_API_KEY`

## Apply

1. Copy `server-index-vercel.js` to the repository as `server/index.vercel.js`.
2. Copy `server.js` to the repository root.
3. Copy `vercel.json` to the repository root.
4. Replace the root `package.json` with `package.json.vercel` (or merge the added backend dependencies/scripts).
5. Replace your current `App.jsx` with `App-vercel-demo.jsx` if you want the completion message to explicitly say the complaint is not saved.
6. Keep your existing `server/classification.js`, `server/complaint-parsing.js`, `server/complaint-validation.js`, `server/conversation-response.js`, `server/demo-data.js`, `server/location-parser.js`, and `server/tts-voices.js`.
7. Run `npm install` in the repo root so the root lockfile contains the added backend dependencies.
8. Run `npm run build`.
9. Commit and push to GitHub.
10. In Vercel, import the repo and add `GNANI_API_KEY` under Environment Variables for Production/Preview/Development.

The browser microphone is already handled by the existing React code using `getUserMedia`, and Vercel provides HTTPS, so users can click the microphone and speak.

## Important

Do not add `GNANI_API_KEY` to any `VITE_*` variable or frontend file.
Do not add SQLite to the hosted version.
