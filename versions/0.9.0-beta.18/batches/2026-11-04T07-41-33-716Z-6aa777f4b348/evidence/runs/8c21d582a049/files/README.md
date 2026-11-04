# Neon Pairs
Find every matching pair on boards from 4x4 to 16x16. Play with a mouse, touch, or keyboard. The game is silent.

Open **[dist/index.html](dist/index.html)** directly in a browser. Its JavaScript, CSS, and SVG artwork are inline; play needs no server or network. Use a local HTTP origin when checking saved size preferences and best scores, because browser storage behavior on `file:` URLs varies. If storage is blocked, play and records remain available for the current session.

The [product specification](docs/README.md) defines the game; [Architecture](docs/architecture.md) defines its structure.

## Develop and build

Use Node.js 24.19 or later and npm. Dependencies are pinned in `package.json` and `package-lock.json`.

| Command | Result |
| --- | --- |
| `npm ci` | Install exactly the locked packages |
| `npm run dev` | Start the local development server |
| `npm run typecheck` | Check the separate browser and Node compiler projects |
| `npm test` | Run colocated unit and replay-command tests |
| `npm run build` | Type check, then emit the standalone `dist/index.html` |
| `npm run test:e2e` | Build current source, then test that build in fresh Chromium contexts |
| `npm run --silent replay -- examples/replay.json` | Print the replay's final snapshot JSON |

For browser tests on a new machine, install the browser with `npx playwright install chromium`; Linux may also require `npx playwright install-deps chromium`. Browser tests manage their own HTTP server and stop it afterward. A failed build stops `test:e2e` before any earlier distribution can be tested.

## Repeat or save a game

Open **Reproduce a game**, enter `np1-4-1` in **Board code**, and choose **Load board** to reproduce the published example deal. **Restart** repeats the current code; **New Game** creates another deal.

**Export snapshot** fills **Snapshot JSON** with readable JSON for manual copying. Paste saved JSON and choose **Load snapshot** to restore it. Unfinished imports pause both the clock and a pending mismatch until **Resume**. Completed imports show a static summary and do not change best scores. Progress is not automatically saved across reloads.

Replay is a CLI feature. Its [example file](examples/replay.json) matches the first published pair and ends at 800 active milliseconds. Valid files print only the final version 1 snapshot to stdout and exit 0. Invalid or unreadable files print an error to stderr, leave stdout empty, and exit nonzero. See [Reproducibility](docs/reproducibility.md) for the exact board-code, snapshot, and replay formats and limits.

## Code placement

- `src/game`: pure deal generation, turns, logical time, snapshot validation, and replay.
- `src/game/session`: the local React session, monotonic browser clock, visibility, preferences, and best scores.
- `src/game/board`: native card buttons, SVG faces, roving keyboard focus, and scrolling.
- `src/game/controls`: native deal and reproduction controls.
- `src/game/Game.tsx`: composition, statistics, completion banner, and one result live region.
- Colocated `*.test.ts`: focused behavior tests; `tests/`: complete built-application journeys and evidence generation.

No development fixture, solver endpoint, diagnostic global, external asset, audio API, or service is included in the distribution. Authored TypeScript files are at most 200 lines.

## Verified compatibility and acceptance

Verified on 4 November 2026 with **Node 26.12.1, npm 11.20.0, Playwright 1.64.1, and Chromium 156.0.8078.4**. This is the compatibility combination named by the specification. All package versions match its pins.

| Check | Result |
| --- | --- |
| `npm ci` | Passed; locked install, 50 packages, no reported vulnerabilities |
| `npm run typecheck` | Passed; all authored source, unit tests, browser tests, and tooling checked |
| `npm test` | Passed; 137 tests in 10 files, including literal generation vectors and actual replay-command output/exit checks |
| `npm run build` | Passed; one 240,221-byte `dist/index.html` |
| `npm run test:e2e` | Passed; 27 browser journeys against a fresh production build |
| `npm run --silent replay -- examples/replay.json` | Passed; final snapshot has one pair, one move, and 800 elapsed milliseconds |

Browser checks finish every supported board size; cover ignored turns, exact mismatch boundaries, replacement timers, snapshot validation and pauses, best-score comparisons/reload, unavailable storage, keyboard focus, accessible names, repeated live announcements, native touch swipes, and direct-from-disk play with networking blocked. Hidden-page handling is checked with injected visibility events in the browser and injected monotonic time in session tests; it is not a claim of native tab-background testing.

The [keyboard accessibility-tree evidence](evidence/accessibility.md) records the complete 4x4 journey, revealed names, matched states, one result per turn, final summary, native Tab exit, and starting another game. **No screen reader was used.** Spoken output and a real-device long press remain user acceptance, as specified in [Input](docs/input.md) and the [specification scope](docs/README.md).

The [44px grayscale sheet](evidence/faces-grayscale-44px.png) contains all 128 face identities, reviewed for shape, marker, and fill distinctions including diagonal squares. Layout, internal scrolling, and complete focus outlines were measured at 360x800, 1280x800, and 640x400 with device scale 2 for the last viewport, covering 4x4 and 16x16 boards. Screenshots: [phone](evidence/layout-360.png), [desktop](evidence/layout-1280.png), [equivalent 200% zoom](evidence/layout-640.png).
