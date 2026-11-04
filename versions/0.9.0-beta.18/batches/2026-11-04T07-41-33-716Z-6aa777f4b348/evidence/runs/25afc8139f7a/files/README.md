# Neon Pairs

A silent, offline memory game built with React and TypeScript, implementing [specification 2.2](docs/README.md).

Open **[dist/index.html](dist/index.html)** directly in a browser. The distribution is one self-contained HTML file with inline script, styles and SVG artwork; playing requires no server or network connection.

## Play and reproduce

Choose any square grid from 4x4 to 16x16. Reveal cards by click, tap, Enter or Space. Arrow keys move within the board; Tab leaves it. A mismatch closes after 800 active milliseconds. Hiding the page pauses both the clock and that interval.

New Game deals fresh cards. Restart repeats the current deal. Grid size and each size's best move count are saved when browser storage is available; current progress stays in memory.

Expand **Reproduce a game** to load a board code or copy an exported snapshot. Unfinished snapshot imports wait for Resume. Completed imports show a static result without changing local bests. The [version 1 formats and generation algorithm](docs/reproducibility.md) define interoperability.

Replay is available through the developer command, without a browser:

```sh
npm run --silent replay -- path/to/replay.json
```

Success prints only the final snapshot JSON and exits 0. Invalid input prints nothing to stdout, writes an error to stderr and exits nonzero.

## Build and test

Use Node.js 24.19 or later and npm. Dependencies are pinned in `package.json` and `package-lock.json`.

```sh
npm ci
npx playwright install chromium
npm run typecheck
npm test
npm run test:e2e
npm run build
```

`npm run dev` starts the development server. `npm run build` type-checks both compiler projects before emitting `dist/index.html`. `npm run test:e2e` first builds current source, then checks that build in fresh browser contexts; a failed build stops browser tests. Its preview server is stopped automatically.

Serve the game from a local HTTP origin when checking saved preferences; storage behavior on a `file:` URL varies by browser. Storage failures leave the current session playable.

## Implementation

- `src/Game.tsx` composes status, board, deal controls and reproduction controls.
- `src/game/` contains pure deterministic generation, immutable state transitions, logical time, snapshot validation and replay.
- `src/game/session/` owns React session state, monotonic browser time, visibility, preference storage and announcements.
- `src/game/board/` owns card artwork, native card buttons and remembered keyboard focus.
- `src/game/controls/` owns native deal and reproduction controls.
- `scripts/replay.ts` handles replay file input and CLI output using the same pure core.
- Focused unit tests sit beside their behavior; `tests/` contains complete browser journeys.

The game exposes its documented controls only. Test fixtures and evidence generation stay outside the shipped application. Authored TypeScript files remain below the 200-line limit in [Architecture](docs/architecture.md) and [Technology](docs/technology.md).

## Verification evidence

Tested on 4 November 2026 with **Node 26.12.1, npm 11.20.0, Playwright 1.64.1 and Chromium 156.0.8078.4**. TypeScript 7.0.2, React 19.3.1, Vite 8.3.5 and Vitest 5.0.5 use the required exact package pins.

| Command | Result |
| --- | --- |
| `npm ci` | Passed; locked install, 50 packages |
| `npm run typecheck` | Passed; separate browser and Node projects |
| `npm test` | Passed; 173 unit and CLI tests across 10 files |
| `npm run build` | Passed; self-contained `dist/index.html` |
| `npm run test:e2e` | Passed; all 38 Chromium journeys in a fresh-build run (2.3 minutes) |
| `npm run --silent replay -- PATH` | Valid snapshot output and invalid-input stdout/stderr/exit behavior checked by CLI tests |

Browser journeys cover every supported size through completion, immediate matches, ignored activation, exact mismatch timing, stale renders and restarted deals, snapshots and paused Resume focus, capped scores/time, persistent bests, corrupt/unavailable storage, pointer/touch/keyboard input, hidden-face privacy, silent play and reduced motion. The offline journey completes a game from `file:` with network blocked and checks for no external requests or page errors.

Visibility checks use controlled `document.hidden` values and `visibilitychange` events with Playwright's logical clock. Touch scrolling uses native Chromium touch start/move/end events. Layout checks measure the complete focus outline at board endpoints and mid-board at 360x800, 1280x800 and the 640x400/device-scale-2 zoom equivalent.

- [Complete keyboard accessibility-tree journey](evidence/accessibility.md), including all eight turn announcements and keyboard New Game.
- [All 128 faces at 44px in grayscale](evidence/faces-grayscale.png), visually reviewed for distinct shape, marker and fill, including diagonal square markers.
- Layout captures: [360x800](evidence/layout-360x800.png), [1280x800](evidence/layout-1280x800.png), [640x400 at scale 2](evidence/layout-640x400.png).

No screen reader was used. Spoken output and a real-device long-press context menu remain user acceptance checks, as [Input](docs/input.md) and the [specification scope](docs/README.md#out-of-scope) describe.
