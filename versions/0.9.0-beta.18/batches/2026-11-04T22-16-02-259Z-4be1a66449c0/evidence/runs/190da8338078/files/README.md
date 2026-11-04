# Neon Pairs

Neon Pairs is a browser memory game. Read the [game specification](docs/README.md) for the complete requirements and document map.

## Build and test

The verified compatibility combination is Node.js 26.12.1, npm 11.20.0, Playwright 1.64.1 and Chromium 156.0.8078.4.

On 4 November 2026, the locked install and project checks passed with those versions:

- `npm ci` — installed the locked dependencies.
- `npm run typecheck` — passed both TypeScript compiler projects.
- `npm test` — 24 unit tests passed across 6 files.
- `npm run test:e2e` — 7 browser journeys passed. The command builds current source before launching Chromium.
- `npm run build` — passed and emitted the 245,458-byte offline file at `dist/index.html`.

The browser journeys open the distribution from disk and confirm it makes no HTTP requests. They also exercise saved preferences on the local HTTP preview origin. The keyboard journey writes real closed, revealed and matched accessibility-tree captures to [docs/accessibility-tree-evidence.md](docs/accessibility-tree-evidence.md).

No screen reader was used during developer testing. Spoken output remains part of user acceptance as described in [Input](docs/input.md).

## Replay a game

Run `npm run --silent replay -- PATH` with a version 1 replay JSON file. Valid input prints the final snapshot JSON. Invalid input writes an error to stderr and exits nonzero.

For local development, run `npm run dev`. Use `npm run build` to refresh `dist/index.html`.
