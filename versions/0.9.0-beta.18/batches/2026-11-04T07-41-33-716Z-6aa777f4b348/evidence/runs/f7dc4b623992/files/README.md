# Neon Pairs

Neon Pairs is a browser memory game that asks you to find every matching pair. Read the [game specification and document map](docs/README.md) for gameplay and implementation requirements.

## Build and run

The game uses React, TypeScript and Vite. Dependencies and versions are pinned in `package-lock.json`.

```sh
npm ci
npm run dev
npm run typecheck
npm test
npm run test:e2e
npm run build
npm run --silent replay -- PATH
```

`npm run test:e2e` builds from current source before starting Playwright. The build failure stops the browser run. `npm run build` emits the standalone offline distribution at [dist/index.html](dist/index.html); open it directly from disk to play.

## Verification

The tested compatibility combination was Node.js `26.12.1`, npm `11.20.0`, Playwright `1.64.1` and Chromium `156.0.8078.4`.

- `npm ci` installed 50 packages; audit reported zero vulnerabilities.
- `npm run typecheck` passed.
- `npm test` passed 18 unit tests in 4 files.
- `npm run test:e2e` built the distribution and passed 33 browser journeys in 4.9 minutes.
- `npm run build` passed and emitted `dist/index.html` at 242,007 bytes (242.00 kB).
- A post-split focused run passed all 6 keyboard/accessibility and touch browser journeys.
- After the final snapshot-editor typography adjustment, typecheck/build passed again and the affected control browser journey passed 1/1.
- The valid replay example exited 0, wrote only its final snapshot to stdout and left stderr empty. Invalid `{}` exited 1, left stdout empty and wrote `Invalid replay.` to stderr.
- `npm run dev` served the game at a local HTTP URL; a request returned `<title>Neon Pairs</title>`. The server was stopped after the check.
- Browser tests opened the built file from `file://` with network access disabled. The single HTML file made no network requests. Local HTTP tests confirmed saved size persistence and continued play when storage operations throw.

The automated accessibility journey records the initial board, first reveal, completed game and keyboard reset: [accessibility journey](evidence/accessibility-journey.txt). It was captured with Playwright `1.64.1` and Chromium `156.0.8078.4`. No screen reader was used; spoken output and real-device touch long-press remain user-acceptance checks from the specification.

The [grayscale face sheet](evidence/grayscale-faces.png) shows all 128 identities at 44px on a completed 16x16 board. The sheet was generated with grayscale artwork, then visually reviewed for shape, marker direction and solid/outline differences.

Read the complete [acceptance journeys](docs/acceptance.md) and [architecture](docs/technology/architecture.md).
