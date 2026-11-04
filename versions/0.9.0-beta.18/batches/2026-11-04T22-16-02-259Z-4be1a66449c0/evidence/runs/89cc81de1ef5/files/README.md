# Neon Pairs

Neon Pairs is an offline browser memory game. The product specification and requirement map are in [docs/README.md](docs/README.md).

## Run and build

Use Node.js 26.12.1 and npm 11.20.0 for the tested compatibility setup.

```sh
npm ci
npm run dev
npm run typecheck
npm test
npm run test:e2e
npm run build
```

The build writes `dist/index.html` as a self-contained HTML file. Open it directly from disk to play offline. Use the local HTTP server from `npm run dev` to check saved grid preferences and best scores; browser storage on a `file:` URL varies by browser.

Run a replay file through the game core with:

```sh
npm run --silent replay -- PATH
```

Valid input prints the final version 1 snapshot JSON to stdout. Invalid input prints an error to stderr and exits nonzero.

## Code layout

- `src/game/board` holds Park–Miller deal generation, card navigation and SVG faces.
- `src/game/core.ts` holds pure card transitions, logical time and win derivation.
- `src/game/reproducibility` validates snapshots and replays.
- `src/game/session` holds monotonic browser timing, page visibility, saved preferences and local best scores.
- `src/game/controls` and `src/Game.tsx` compose native browser controls and the board.
- Unit tests live beside the game behavior. Browser journeys are in `tests/e2e`.

## Verification record

Recorded 2026-11-04 with Node.js 26.12.1, npm 11.20.0, Playwright 1.64.1 and Chromium 156.0.8078.4:

| Check | Result |
| --- | --- |
| `npm ci` | Locked install passed |
| `npm run typecheck` | Passed |
| `npm test` | 13 unit tests passed |
| `npm run test:e2e` | Build passed; 4 browser journeys passed |
| `npm run build` | Passed; emitted the single-file offline distribution |

The browser journeys open `dist/index.html` directly from disk with HTTP and HTTPS requests blocked, complete a 4x4 keyboard game and assert Playwright accessibility-tree snapshots, import and resume a paused mismatch, check saved scores and preferences on HTTP, and check 16x16 touch and keyboard scrolling at 360x800 plus layout at 1280x800 and 640x400 CSS pixels with device scale factor 2. They also check normal and reduced motion. A screen reader was not used; spoken output remains part of user acceptance as described in [Input](docs/input.md#screen-reader).
