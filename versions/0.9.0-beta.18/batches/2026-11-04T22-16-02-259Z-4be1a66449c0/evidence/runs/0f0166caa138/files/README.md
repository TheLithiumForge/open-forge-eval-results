# Neon Pairs
Neon Pairs is an offline browser memory game. It includes reproducible board codes, progress snapshots and a replay CLI.

Read the [game specification](docs/README.md) and its linked requirements.

## Build and run

Use Node.js 24.19 or later with npm.

```sh
npm ci
npm run dev
npm run typecheck
npm test
npm run test:e2e
npm run build
```

The build writes a self-contained `dist/index.html`. Open it directly from disk to play offline. Use a local HTTP origin when checking saved preferences.

Replay a version 1 replay file with:

```sh
npm run --silent replay -- PATH
```

Valid input prints the final snapshot JSON. Invalid input prints an error to stderr and exits nonzero.

## Verification record

Verified 2026-11-04 with Node.js 26.12.1, npm 11.20.0, Playwright 1.64.1 and Chromium 156.0.8078.4. The locked install passed; type checking passed; all 18 unit tests passed; all 8 Playwright journeys passed; and the production build emitted the offline HTML. The browser journeys covered keyboard play and completion, saved bests and size preferences, mismatch timing and restart, paused and completed snapshots, a 16x16 narrow viewport, and direct offline file loading.

Automated accessibility-tree evidence is included in the Playwright journey. A screen reader was not used; spoken output remains a user acceptance check.
