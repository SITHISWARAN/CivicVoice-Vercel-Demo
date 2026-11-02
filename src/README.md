# CivicVoice day/night theme refresh

This drop-in source bundle updates the CivicVoice React UI to the approved cityscape concept.

## What's included
- `App.jsx`: existing application component and workflows, unchanged in behavior.
- `main.jsx`: existing entry point.
- `styles.css`: existing stylesheet plus a final theme layer for day/night city backgrounds, matte cards, purple/indigo accents, chat and voice controls, and responsive overlays.
- `assets/civicvoice-city-day.webp`: daytime cityscape edge art.
- `assets/civicvoice-city-night.webp`: nighttime cityscape edge art.

## Apply
Replace your project's matching `App.jsx`, `main.jsx`, and `styles.css` with these files, and copy the `assets` folder beside `styles.css`. Keep your existing package files, backend, and dependencies. The theme toggle already writes `data-theme="light"` or `data-theme="dark"`; the stylesheet switches the cityscape and palette based on that attribute.

The city artwork is decorative only. It does not alter map coordinates, location lookup, speech recognition, voice recording, complaint validation, API routes, or submission behavior.
