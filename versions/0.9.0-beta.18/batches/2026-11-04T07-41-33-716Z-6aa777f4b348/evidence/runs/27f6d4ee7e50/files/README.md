# Neon Pairs

Neon Pairs is a browser memory game. The full product contract is in the [game specification](docs/README.md), with public journeys in [acceptance](docs/acceptance.md).

## Run

Install the locked dependencies and start the local development server:

```sh
npm ci
npm run dev
```

Build the self-contained offline distribution with `npm run build`, then open `dist/index.html` directly from disk. Use the local development server when checking saved preferences because browsers handle storage on `file:` URLs differently.

## Code map

- `src/game/` contains deterministic board generation, turn transitions, snapshots and replay.
- `src/game/session/` connects the game to the browser clock, page visibility and saved preferences.
- `src/game/board/` renders cards, face SVGs and keyboard navigation; `src/game/controls/` contains game and reproduction controls.
- `src/cli/replay.mts` runs replay files without adding replay controls to the game.
- Unit tests sit beside game behavior. Application journeys live in `tests/e2e/`.

Board codes, snapshots and replay JSON are versioned in the [reproducibility guide](docs/reproducibility.md). Run a replay with:

```sh
npm run --silent replay -- ./replay.json
```

Valid input prints the final snapshot JSON to stdout. Invalid input prints a message to stderr and exits nonzero.

## Verified environment

The named compatibility combination was tested on 4 November 2026 with Node.js `26.12.1`, npm `11.20.0`, Playwright `1.64.1` and Chromium `156.0.8078.4`.

| Command | Result |
| --- | --- |
| `npm ci` | Passed; installed 50 locked packages, 0 vulnerabilities reported. |
| `npm run typecheck` | Passed for the browser and Node compiler projects, including the CLI, Playwright config and e2e tests. |
| `npm test` | Passed: 54 tests across 9 files. |
| `npm run build` | Passed; emitted `dist/index.html` at 240,681 bytes. |
| `npm run test:e2e` | Passed: fresh build and 19 browser, delivery and CLI tests. |
| `npm run dev` | Started successfully and served the app over local HTTP; stopped after the smoke check. |

The detailed test record and generated artifacts are in [acceptance evidence](evidence/acceptance-results.md).

The automated accessibility-tree snapshot is [available here](evidence/accessibility/4x4-keyboard-journey.yml). The [grayscale face sheet](evidence/artworks/grayscale-facesheet.html) shows all 128 faces at application card size; layout captures are linked from the acceptance record.

No screen reader was used; automated accessibility-tree evidence is linked above. Spoken-output confirmation and the real-device long-press context-menu check remain manual acceptance.
