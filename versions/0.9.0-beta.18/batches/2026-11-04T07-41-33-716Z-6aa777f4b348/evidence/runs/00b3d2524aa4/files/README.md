# Neon Pairs

Neon Pairs is an offline memory game for finding matching pairs. The browser build is a single self-contained HTML file at [`dist/index.html`](dist/index.html). Open it directly from disk to play; use a local HTTP origin when checking saved preferences.

The full project requirements and acceptance journeys are in [`docs/README.md`](docs/README.md) and its linked specifications.

Choose a grid size and reveal two cards per turn. Matches remain face up. A mismatch closes after 800 active milliseconds. Keyboard players move through the board with the arrow keys and reveal with Enter or Space.

## Repeat a game

`np1-N-seed` board codes recreate the same shuffled deal. The supported side lengths are 4, 6, 8, 10, 12, 14 and 16; seeds are decimal integers from 1 through 2147483646. For example, `np1-4-1` creates the documented 4×4 deal.

Open **Reproduce a game** to load a board code, export or load a version 1 snapshot, or resume unfinished imported progress. Snapshots save the current position, moves, and elapsed time. A new page load begins a fresh deal; supported grid size and per-size best move counts are the only game preferences saved in browser storage.

Replays stay in the developer CLI:

```sh
npm run --silent replay -- PATH
```

For a valid replay, the command prints the final version 1 snapshot JSON and exits with status 0. Invalid input prints a message to standard error, leaves standard output empty and exits nonzero.

## Project structure

- `src/game/` contains deterministic board generation, card transitions, logical time, snapshot validation and replay. These game rules have no DOM or browser-storage dependencies.
- `src/game/session/` contains browser clock and visibility handling, import pauses, validated preferences and best scores.
- `src/game/board/` contains card buttons, inline SVG faces, roving keyboard focus and board-local styles.
- `src/game/controls/` contains native deal and reproduction controls with their styles.
- `src/game/Game.tsx` composes the game screen. `e2e/` contains complete browser journeys against the built preview.

## Build and test

Use Node.js **26.12.1** and npm **11.20.0**. All runtime and development packages are pinned in `package.json` and `package-lock.json`.
For browser tests on a fresh machine, install the matching Playwright Chromium with `npx playwright install chromium` after `npm ci`.

```sh
npm ci
npm run dev
npm run typecheck
npm test
npm run test:e2e
npm run build
```

`npm run test:e2e` builds the current source and then starts a fresh preview server for Chromium journeys. It fails if the build fails. `npm run build` type-checks both compiler projects and emits `dist/index.html` with its CSS, script and artwork inlined.

## Verification

The locked install, unit tests and browser journeys were run with Node.js 26.12.1, npm 11.20.0, Playwright 1.64.1 and Chromium 156.0.8078.4.

| Check | Result |
| --- | --- |
| `npm ci` | Passed; all locked packages installed |
| `npm run typecheck` | Passed; browser and Node compiler projects |
| `npm test` | Passed; 34 tests in eight files |
| `npm run test:e2e` | Passed; all 20 Chromium journeys against a newly built distribution |
| `npm run build` | Passed; emitted the 242.52 kB single-file HTML |
| Direct `file://` launch with browser offline | Passed; game opened and a card revealed without HTTP(S) requests |

The browser journeys cover all supported board sizes, keyboard completion and its accessibility tree, matching and mismatch timing, page-hidden and imported pauses, stale timers, preferences, score records, offline file opening, 128 face names, 44 px grayscale artwork, phone and desktop 16×16 layouts, and 200% zoom equivalents. The `evidence/` directory contains the captured face sheet, keyboard screenshots and accessibility tree, phone/desktop screenshots, and both zoom screenshots.

No screen reader was used. Spoken announcements and real-device touch long-press behavior remain part of user acceptance. The automated accessibility tree is in [`evidence/accessibility-journey.md`](evidence/accessibility-journey.md).
