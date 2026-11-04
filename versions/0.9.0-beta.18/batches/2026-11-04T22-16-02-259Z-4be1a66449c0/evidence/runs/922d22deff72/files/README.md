# Neon Pairs

Neon Pairs is a browser memory game. Open [dist/index.html](dist/index.html) directly to play offline. The [product specification](docs/README.md) describes the rules, controls and reproducibility formats.

## Development

Use Node.js 24.19 or later and npm.

- `npm ci` installs locked dependencies.
- `npm run dev` serves the game locally.
- `npm run typecheck` checks the browser and Node projects.
- `npm test` runs the game core unit tests.
- `npm run test:e2e` builds the current source and runs browser journeys.
- `npm run build` checks types and creates the single-file offline distribution.
- `npm run --silent replay -- PATH` prints the final snapshot for a replay JSON file. Invalid input writes an error to stderr and exits nonzero.

Preferences and best scores use local storage when available; progress itself remains in memory unless exported as a snapshot. Use an HTTP origin to check persistent storage, because file URL storage behavior varies by browser.

## Verification

On 4 November 2026, the locked install (`npm ci`), typecheck, unit tests, build and browser journeys were run with Node 26.12.1, npm 11.20.0, Playwright 1.64.1 and Chromium 156.0.8078.4. The browser tests exercise the built HTML directly from disk with network requests blocked, storage on a local HTTP origin, a full keyboard game, accessible names and status, snapshot pause and resume, and 16×16 layout at 360×800, 1280×800 and 640×400. The keyboard test inspects Playwright's accessibility tree as well as card names and states. No screen reader was used; spoken output remains for user acceptance.
