# Neon Pairs

Neon Pairs is an offline memory game. Choose a grid size, reveal matching pairs and try to finish in fewer moves. The complete game opens from [dist/index.html](dist/index.html) without external assets or network requests.

The authoritative product requirements are in [docs/README.md](docs/README.md).

## Run and play

Use `npm run dev` to serve the game locally during development. The board accepts mouse, touch and keyboard input. Open **Reproduce a game** to load a board code or snapshot, then copy the snapshot JSON manually if you want to save progress.

Board codes use the form `np1-N-seed`. The generator and version 1 snapshot/replay formats are implemented as pure game functions under `src/game`. The replay command reads one replay JSON file and prints its final snapshot:

```sh
npm run --silent replay -- PATH
```

Replay files are developer input; the game UI does not add replay controls.

## Code layout

```text
src/game/
  deck.ts, boardCode.ts, transition.ts, state.ts, snapshot.ts, replay.ts
  session/      React session, browser clock, visibility and storage
  board/        keyboard navigation, card states and inline SVG artwork
  controls/     native game and reproduction controls
  Game.tsx      application composition
scripts/replay.ts   Node replay command
e2e/                fresh-browser journeys
evidence/            accessibility tree, grayscale face sheet and layout captures
```

Game rules and serialization stay independent of the browser. The session handles browser time and saved preferences; React renders the state and native DOM controls.

## Build and test

Install the locked toolchain, then run the documented checks:

```sh
npm ci
npm run typecheck
npm test
npm run test:e2e
npm run build
```

`npm run test:e2e` builds the current source before opening fresh Playwright browser contexts. The build type-checks both TypeScript projects and inlines scripts, styles and SVG artwork into `dist/index.html`.

## Verification record

Tested on 4 November 2026 with Node.js `26.12.1`, npm `11.20.0`, Playwright `1.64.1` and Chromium `156.0.8078.4`:

| Check | Result |
| --- | --- |
| `npm ci` | Passed; locked install, 50 packages, 0 reported vulnerabilities |
| `npm run typecheck` | Passed; browser and Node compiler projects |
| `npm test` | Passed; 5 test files, 18 tests |
| `npm run test:e2e` | Passed; 22 browser journeys, fresh production build |
| `npm run build` | Passed; emitted the single-file `dist/index.html` |

The browser checks opened the distribution directly from disk with external requests blocked. Saved preferences were checked from a local HTTP origin. The suite covers all seven grid sizes, board codes, snapshots, replay command output, active-time pauses, storage, keyboard and touch journeys, announcements, the 128-face grayscale sheet, large-board scrolling and the 640x400 CSS-pixel, device-scale-2 layout.

A separate browser check confirmed reduced motion disables card transitions and the win animation; with regular motion the win pulse runs once for 600 ms and then returns to a static banner.

Automated accessibility-tree evidence is in [evidence/accessibility.md](evidence/accessibility.md). No screen reader was used, so its name and version are not applicable. Spoken output and real-device long-press behavior remain user acceptance checks. The grayscale face sheet and layout captures are in `evidence/`.
