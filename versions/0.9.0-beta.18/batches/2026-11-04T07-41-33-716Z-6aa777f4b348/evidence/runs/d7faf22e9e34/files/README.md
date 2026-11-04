# Neon Pairs

A silent memory game implementing [product specification 2.2](docs/README.md).

Open **[dist/index.html](dist/index.html)** directly in a browser to play offline. That single file contains the React application, styles and SVG artwork; it needs no server, companion files or network access. Serve the game over local HTTP when checking saved grid sizes and best scores, because browser storage behavior varies for `file:` URLs.

## Play

Choose one of seven square boards, from 4x4 to 16x16. Reveal two cards with clicks, taps, Enter or Space. Arrow keys move within the board; Tab leaves it. Matches remain visible. A miss closes after 800 active milliseconds. The clock pauses while the page is hidden.

New Game creates another deal. Restart repeats the current deal. The game remembers the chosen size and each size's best move count when storage is available. Current progress remains in memory until you export a snapshot.

## Reproduce a game

Open **Reproduce a game** and load a board code such as `np1-4-1` to repeat its starting deck. Export snapshot fills **Snapshot JSON** with readable progress that you can copy and save. Paste it back and choose Load snapshot to restore it. Unfinished snapshots start paused; Resume returns focus to the remembered card and continues their remaining active time. Completed snapshots show a static win without replacing a local best.

The developer replay command takes a UTF-8 JSON file. Save this [documented replay example](docs/sharing/reproducibility.md#replay) as `replay.json`:

```json
{"version":1,"boardCode":"np1-4-1","actions":[{"atMs":0,"index":0},{"atMs":0,"index":11}],"endMs":800}
```

```sh
npm run --silent replay -- replay.json
```

It prints only the final version 1 snapshot JSON: one matched pair, one move and 800 elapsed milliseconds. Invalid files print a diagnostic to stderr, leave stdout empty and exit nonzero. Board code, snapshot and replay validation follows the [version 1 formats](docs/sharing/reproducibility.md).

## Development commands

Use Node.js 24.19 or later and npm. All dependency versions are pinned in `package.json` and `package-lock.json`.

| Command | Result |
| --- | --- |
| `npm ci` | Install the locked dependencies |
| `npm run dev` | Serve the game locally |
| `npm run typecheck` | Check the separate browser and Node compiler projects |
| `npm test` | Run colocated unit tests, including the replay CLI |
| `npm run build` | Type check and emit the standalone `dist/index.html` |
| `npm run test:e2e` | Build current source, then test that build in fresh browser contexts |
| `npm run --silent replay -- PATH` | Replay a JSON file and print its final snapshot |

Install the browser before the first browser-test run with `npx playwright install chromium`. The browser command stops on build failure and starts its own local preview server with port reuse disabled. It stops that server after the run.

## Code structure

The implementation follows [Architecture](docs/technology/architecture.md):

| Location | Responsibility |
| --- | --- |
| `src/game/boardCode.ts`, `deck.ts`, `state.ts`, `transitions.ts` | Immutable deals, pure card transitions and logical time |
| `src/game/snapshot.ts`, `replay.ts` | Strict progress validation, serialization and pure replay |
| `src/game/session/` | React state, monotonic browser clock, visibility, seeds and validated storage |
| `src/game/board/` | Card SVGs, names, focus and native input |
| `src/game/controls/`, `status/` | Deal/reproduction controls and score/completion display |
| `src/Game.tsx` | Compose the game and its single polite atomic live region |
| `tools/replay.ts` | Node CLI file access and output |
| Colocated `*.test.ts(x)` and `tests/` | Focused unit tests and application browser journeys |

Styles and props stay beside their components. Every authored TypeScript file is at most 104 lines. Browser effects stay outside the pure game core. Test fixtures and diagnostics stay outside the shipped application.

## Verified compatibility and evidence

Verified on 4 November 2026 with **Node 26.12.1, npm 11.20.0, Playwright 1.64.1 and Chromium 156.0.8078.4**, using the exact package pins in [Technology](docs/technology/technology.md).

| Completed command | Result |
| --- | --- |
| `npm ci` | Passed; locked install, zero audit vulnerabilities |
| `npm run typecheck` | Passed both compiler projects |
| `npm test` | Passed 148 tests across 12 files |
| `npm run build` | Passed; emitted one 240,835-byte HTML file |
| `npm run test:e2e` | Fresh build passed all 39 browser journeys |
| `npm run --silent replay -- PATH` | Valid example: exit 0, JSON-only stdout; invalid input: nonzero, empty stdout |

The browser journeys complete every supported size; check native keyboard, click and tap input; validate turn announcements, snapshots, best scores and storage failures; and play the built HTML directly from disk with network access blocked. Exact mismatch timing uses Playwright's clock. The visibility journey simulates `document.visibilityState` changes and dispatches `visibilitychange` to exercise the session handler. Large-board touch scrolling uses native CDP touch-start, move and end events on both axes.

- [Browser results](evidence/browser-results.json)
- [Accessibility trees: closed board, reveal, pair, victory and new game](evidence/keyboard-journey.aria.yml)
- [All 128 faces at 44px in grayscale](evidence/face-sheet-grayscale.png), reviewed for distinct shape, marker and fill

| Viewport | 4x4 focus evidence | 16x16 focus evidence |
| --- | --- | --- |
| 360x800 | [Phone](evidence/phone-4-focus-last.png) | [Phone](evidence/phone-16-focus-last.png) |
| 1280x800 | [Desktop](evidence/desktop-4-focus-last.png) | [Desktop](evidence/desktop-16-focus-last.png) |
| 640x400, device scale 2 | [Equivalent 200% zoom](evidence/zoom-4-focus-last.png) | [Equivalent 200% zoom](evidence/zoom-16-focus-last.png) |

The layout checks measure every card and verify complete focus outlines at the first, middle and last positions. Reduced-motion checks cover card transitions and the win banner. Offline and silence checks cover play, completion and reset.

No screen reader was used. Automated accessibility-tree evidence was collected with Playwright 1.64.1 and Chromium 156.0.8078.4. Spoken output and real-device touch long-press confirmation remain the user acceptance checks described in [Input](docs/interface/input.md#screen-reader) and the [specification scope](docs/README.md#out-of-scope).
