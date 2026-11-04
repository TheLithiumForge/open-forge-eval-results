# Neon Pairs

Neon Pairs is an offline browser memory game. Product behavior, accessibility, visuals, reproduction formats and architecture follow the [game specification](docs/README.md).

## Development

Use Node.js 24.19 or later and npm. The verified compatibility set is recorded below.

```sh
npm ci
npm run dev
npm run typecheck
npm test
npm run test:e2e
npm run build
npm run --silent replay -- PATH
```

`npm run test:e2e` builds the current source before running Playwright against the fresh build. `npm run build` checks every TypeScript project and writes the single-file offline distribution to `dist/index.html`. Open that file directly from disk to play without a server or network connection.

The replay command accepts a version 1 replay JSON file. It prints the resulting snapshot JSON to stdout; invalid input prints an error to stderr and exits nonzero.

## Verified environment

Verified on 4 November 2026 with Node.js `26.12.1`, npm `11.20.0`, Playwright `1.64.1` and Chromium `156.0.8078.4`.

- `npm ci` completed with the pinned lockfile.
- `npm run typecheck` passed.
- `npm test` passed all 16 game-core tests.
- `npm run build` produced `dist/index.html`.
- `npm run test:e2e` passed all 8 browser journeys against a fresh build, including saved-score comparisons, timer invalidation, completed snapshot import, a direct file open and a zoom-equivalent viewport.
- The keyboard completion journey captures initial and completed accessibility-tree snapshots under `test-results/` and attaches them to the Playwright result.
- No screen reader was used for this run. Spoken output remains a user-acceptance check as described in [Input](docs/interface/input.md#screen-reader).
