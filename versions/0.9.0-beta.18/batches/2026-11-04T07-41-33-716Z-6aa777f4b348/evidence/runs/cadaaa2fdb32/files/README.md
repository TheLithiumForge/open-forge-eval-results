# Neon Pairs

A silent, offline memory game built from the [product specification](docs/README.md), version 2.2. Supports every grid from 4x4 through 16x16, pointer, touch and keyboard play, deterministic board codes, saved snapshots and a replay CLI.

Open **[dist/index.html](dist/index.html)** directly in a browser. This is the complete distribution: React, CSS and SVG artwork are inline, with no external assets or network requests. For persistent size preferences and best scores, use a local HTTP origin; file-URL storage depends on the browser. Progress stays in memory until you export a snapshot.

## Build and run

Use Node.js 24.19 or later and npm. All specified direct dependency versions are pinned in `package.json` and `package-lock.json`.

```sh
npm ci
npm run dev
npm run typecheck
npm test
npx playwright install chromium
npm run test:e2e
npm run build
```

`test:e2e` first builds the current source and stops if that build fails, then serves the distribution in fresh browser contexts. Its temporary HTTP server shuts down when tests finish. `build` checks both compiler projects before producing the single HTML file.

## Reproduce a game

Open **Reproduce a game**. Load `np1-4-1` to reproduce the documented starting deck. **Restart** repeats the current deal; **New Game** generates another seed at the same size.

**Export snapshot** fills the Snapshot JSON field with readable progress that you can copy manually. **Load snapshot** validates all fields before replacing play. Unfinished imports pause until **Resume**, including any pending mismatch. Completed imports show a static win and do not change best scores. An example is in [examples/mismatch.snapshot.json](examples/mismatch.snapshot.json).

Replay runs only in the CLI:

```sh
npm run --silent replay -- examples/one-pair.replay.json
```

This prints only the final version 1 snapshot JSON and exits 0. The example finishes with one matched pair, one move and 800 elapsed milliseconds. Invalid files produce a message on stderr, no stdout, and a nonzero exit status. The exact formats and validation limits are in [reproducibility.md](docs/reproducibility.md).

## Code structure

- `src/game/boardCode.ts`, `deck.ts`, `state.ts`, `rules.ts`, `snapshot.ts` and `replay.ts`: pure rules, logical time and formats, shared by UI, unit tests and CLI.
- `src/game/session/`: React session state, monotonic active clock, visibility handling, seed creation and defensive preference storage.
- `src/game/board/`: roving focus, native card buttons, keyboard movement and face SVGs.
- `src/game/controls/`: deal and reproduction controls; props and styles stay beside each component.
- `src/game/Game.tsx`: composition; `Status.tsx`: statistics and completion banner.
- Behavior tests sit beside core modules; `tests/` contains complete browser journeys. Development evidence and examples are not imported by the shipped application.

The browser and Node compiler projects are separate. All authored TypeScript files are below the 200-line limit. Storage uses only `neon-pairs.preferences.v1`, holds supported sizes and validated best moves, and tolerates blocked reads and writes.

## Verification

Tested on 4 November 2026 with **Node.js 26.12.1, npm 11.20.0, Playwright 1.64.1 and Chromium 156.0.8078.4**. TypeScript is 7.0.2; Vite is 8.3.5; React is 19.3.1. No other runtime/browser combination is claimed as tested.

- `npm ci`: passed from the checked-in lockfile.
- `npm run typecheck`: passed for browser and Node projects.
- `npm test`: 79 tests passed across five files, including independent literal deck vectors and a vector that forces rejection sampling.
- `npm run build`: passed; emits only `dist/index.html`.
- `npm run test:e2e`: all 27 browser tests passed against a fresh build (2.7 minutes).
- Browser journeys exercise turns and timing, every board size, size-specific best scores, restart and replacement during mismatches, snapshot validation and Resume, keyboard and touch input, reduced motion, and replay CLI exit/output behavior.
- Offline verification opens the built HTML using `file:` with networking disabled and completes a game. Storage behavior is checked separately over HTTP, including corrupt data, unavailable storage and unrelated keys.
- Layout checks cover 360x800, 1280x800, and 640x400 at device scale 2, with both 4x4 and 16x16 boards. They measure card sizes, page width, and the full focus outline at first, middle and last positions.
- A mobile Chromium journey swipes the 16x16 board with CDP touch start/move/end events, reaches the last card on both scroll axes, and verifies that swipes do not reveal cards.
- Browser timing checks freeze the monotonic test clock and exercise exact interval boundaries. Hidden-page checks dispatch visibility changes with an emulated hidden state.

[Accessibility-tree evidence](docs/evidence/accessibility-tree.json) records actual Chromium CDP trees plus Playwright ARIA snapshots for a complete keyboard journey: closed cards, a revealed face, victory, native Tab exit and a fresh deal. The tool versions are also recorded in that file. **No screen reader was used.** Spoken announcements and real-device long-press behavior remain user acceptance checks as specified in I17 and the document map.

The [44px grayscale face sheet](docs/evidence/face-sheet.png) contains all 128 identities. Shape, marker position and solid/outline fill were visually reviewed, including diagonal markers on squares.
