# Neon Pairs

Neon Pairs is an offline browser memory game. Reveal cards to find every pair. The full product specification and document map are in [docs/README.md](docs/README.md).

Open [dist/index.html](dist/index.html) directly to play without a server or network. Saved preferences depend on browser storage; for consistent persistence, serve the game from a local HTTP origin with `npm run dev`.

## Development

Use Node.js 24.19 or later and npm. Install the locked dependencies with `npm ci`. The commands are:

- `npm run dev` starts the local development server.
- `npm run typecheck` checks the browser and Node TypeScript projects.
- `npm test` runs the game-core tests.
- `npm run build` type-checks and produces the self-contained `dist/index.html`.
- `npm run test:e2e` builds afresh and runs the Playwright browser checks. Install its browser with `npx playwright install chromium` if needed.
- `npm run --silent replay -- PATH` reads a version 1 replay file and prints its final snapshot. Invalid input exits nonzero and reports an error on stderr.

## Verification

The locked install (`npm ci`), type check, unit tests, production build, and browser journeys were run with Node.js 26.12.1, npm 11.20.0, Playwright 1.64.1, and Chromium 156.0.8078.4. The browser checks exercise the built file with network requests blocked, saved scores on a local HTTP origin, snapshot pausing, keyboard play, focus and scrolling on large boards, and accessible names and results. The keyboard-only 4×4 journey queries Chromium's accessibility tree through the Chrome DevTools Protocol and checks controls, closed and matched card names, and the win result. No screen reader was used; spoken output and real-device touch long press remain user acceptance checks.
