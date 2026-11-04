# Neon Pairs

A silent, offline memory game built to [specification 2.2](docs/README.md). Includes all seven board sizes, deterministic board codes, saved best scores, snapshot import/export and the version 1 replay command.

Open **[dist/index.html](dist/index.html)** directly in a browser. This is the complete distribution: scripts, styles and SVG artwork are embedded. Playing requires no server or network. Use an HTTP origin for reliable saved size and best-score persistence; active progress is saved only when you export a snapshot.

## Develop and verify

Use Node.js 24.19 or later and npm. Dependencies are pinned to the [specified versions](docs/technology/technology.md) in `package.json` and `package-lock.json`.

| Command | Result |
| --- | --- |
| `npm ci` | Install the locked dependencies |
| `npm run dev` | Start the local development server |
| `npm run typecheck` | Check the browser, Node and browser-test compiler projects |
| `npm test` | Run focused unit and replay CLI tests |
| `npm run test:e2e` | Build current source, then check that build in fresh Chromium contexts |
| `npm run build` | Type check and emit the single offline HTML file |
| `npm run --silent replay -- PATH` | Print the final snapshot for a replay JSON file |

For a new browser-test environment, first run `npx playwright install chromium`. The browser test server serves only the production HTML. A failed build stops `test:e2e` before a browser starts. The server shuts down after the run.

## Play and reproduce

Use a primary click, tap, Enter or Space to reveal a card. Arrow keys move within the board; Tab leaves it. Matches stay open. Misses close after 800 active milliseconds. Hidden pages pause both the elapsed clock and pending miss.

Open **Reproduce a game** to copy a board code or export progress as readable Snapshot JSON. A board code repeats a starting deal; Restart repeats the current code. Import unfinished progress, then select Resume to continue. Completed imports keep the banner static and preserve local best scores.

Replay uses the same pure rules as the browser. Its file format, exact validation limits and illustrative replay are in [Reproducibility](docs/sharing/reproducibility.md). Valid replay input prints only the final snapshot JSON and exits 0. Invalid input prints an error to stderr, leaves stdout empty and exits nonzero.

## Code arrangement

The code follows [Architecture](docs/technology/architecture.md):

- `src/Game.tsx` composes the display, board and controls.
- `src/game/boardCode.ts`, `state.ts` and `transitions.ts` own immutable deals, card rules and logical time.
- `src/game/snapshot.ts`, `snapshotValidation.ts` and `replay.ts` own pure format handling. `replay.cli.ts` adds Node file I/O.
- `src/game/session/` owns React session state, monotonic browser time, visibility, timer invalidation and validated preferences. Only size and best scores use storage.
- `src/game/board/` owns focus navigation, native card buttons and the 128 SVG faces. Hidden faces are absent from the DOM.
- `src/game/controls/` owns deal, reproduction and Resume controls. Component props and styles stay beside their components.
- Focused tests sit beside their behavior. Complete browser journeys and their test server live in `tests/`. Fixtures and evidence tools are excluded from the game bundle.

Authored TypeScript files stay below 200 lines. Browser and Node compiler projects are separate; browser automation has its own compiler project for code that runs in both environments. All three enable the strictness flags required by T04.

## Verification record

Tested on 4 November 2026 with the named compatibility combination:

| Runtime/tool | Version |
| --- | --- |
| Node.js | 26.12.1 |
| npm | 11.20.0 |
| Playwright | 1.64.1 |
| Chromium | 156.0.8078.4 |

`npm ci`, `npm run typecheck`, `npm test` (82 tests), `npm run build` and `npm run test:e2e` (22 journeys) pass. Unit tests cover literal generation vectors, complete pairs at every size, turn rules, exact mismatch deadlines, counter caps, strict format validation, UTF-8 limits, replay order and CLI output. Browser journeys cover every size through completion, paused imports, failed loads, saved bests, storage failure, reset timers, keyboard and touch input, repeated announcements, reduced motion and offline disk play with networking disabled. Visibility timing uses a synthetic `visibilitychange` event with a controlled hidden state.

Large-board checks run at 360x800, 1280x800 and 640x400 CSS pixels, the last with device scale 2. They check internal scrolling, card dimensions, full focus outlines at the edge and middle, and a readable completion banner.

- [Accessibility-tree evidence](artifacts/accessibility-journey.txt) captures the complete 4x4 keyboard journey, revealed and matched names, turn result, final match with win, Tab exit and another game.
- [44px grayscale face sheet](artifacts/faces-grayscale-44px.png) contains all 128 production faces in ID order, read left to right. The faces were visually reviewed for shape, fill and marker distinctions.
- [Game screenshot](artifacts/neon-pairs.png) shows the offline distribution.

No screen reader was used. Spoken announcements and real-device touch long-press context menus remain user acceptance checks, as specified in [Input](docs/interface/input.md) and [Acceptance](docs/acceptance.md).
