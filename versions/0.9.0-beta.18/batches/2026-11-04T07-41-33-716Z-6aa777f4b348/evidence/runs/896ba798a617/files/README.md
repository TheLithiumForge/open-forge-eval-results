# Neon Pairs

An offline React and TypeScript memory game, implemented from [specification 2.2](docs/README.md). Find all pairs with mouse, touch or keyboard on boards from 4x4 through 16x16. Shape, marker position and solid/outline fill identify each face. The game is silent.

## Play offline

Open **[dist/index.html](dist/index.html)** directly in a browser. This single file includes the JavaScript, styles and SVG artwork; no server, network, account or additional files are needed. Browser zoom remains enabled.

Use arrow keys to move within the board and Enter or Space to reveal. Tab leaves the board. New Game deals fresh cards; Restart repeats the current deal. Moves and active time start with play, pause while the page is hidden and stop on completion. Mismatches close after 800 active milliseconds.

Preferences and best move counts are saved when browser storage is available. Reload starts a fresh deal at the remembered size. Use a local HTTP origin to check storage reliably; file-URL storage behavior varies by browser. Storage failures leave the current session playable.

## Reproduce a game

Expand **Reproduce a game** to access the documented formats:

- **Board code:** load a deal such as `np1-4-1`. A code reproduces its initial cards without progress.
- **Snapshot JSON:** Export snapshot fills the textarea with readable version 1 JSON for manual copying. Load snapshot validates the complete draft. Unfinished imports pause until Resume; completed imports stay static and do not update best scores.
- **Replay CLI:** replay is available in the core and command line, with no game UI controls. Its times describe active logical time, excluding hidden-page and snapshot-pause time.

Run `npm run --silent replay -- PATH` with a version 1 replay JSON file, for example:

```json
{"version":1,"boardCode":"np1-4-1","actions":[{"atMs":0,"index":0},{"atMs":0,"index":11}],"endMs":800}
```

Valid input prints only the final snapshot JSON to stdout and exits 0. This example produces matched positions `[0,11]`, one move and 800 elapsed milliseconds. Invalid input writes a message to stderr, leaves stdout empty and exits nonzero. See [Reproducibility](docs/reproducibility.md) for canonical codes, validation constraints and byte/action limits.

## Develop and verify

Use Node.js 24.19 or later and npm. Exact package versions are pinned in `package.json` and `package-lock.json`. Install the matching Chromium browser once with `npx playwright install chromium` if it is not already present; browser installation may require network access.

| Command | Result |
| --- | --- |
| `npm ci` | Install locked dependencies |
| `npm run dev` | Start the development server; stop with Ctrl+C |
| `npm run typecheck` | Strictly check browser, Node and browser-test compiler projects |
| `npm test` | Run colocated unit tests |
| `npm run test:e2e` | Build current source, then run fresh-context Chromium journeys against that build |
| `npm run build` | Type check and emit the standalone `dist/index.html` |
| `npm run --silent replay -- PATH` | Validate and run a replay; print its final snapshot |

The browser command uses `npm run build && playwright test`, so a failed build stops the command before browser testing. Playwright starts a local preview server for the built distribution and stops it on completion. It does not reuse an existing server. The offline journey copies only `dist/index.html` into an otherwise empty temporary directory, opens it using `file:`, disables networking, completes a game and restarts it.

## Architecture

- `src/Game.tsx` composes status, board, deal controls and reproduction controls.
- `src/game/*.ts` holds pure deck generation, immutable board/deck descriptions, transitions, logical time, snapshot validation and replay. Browser play and the CLI call the same rules.
- `src/game/board/` owns native card buttons, roving focus, keyboard navigation and face SVGs. Hidden cards mount no face artwork or identity attributes.
- `src/game/controls/` owns the native select, buttons, details, text input and textarea.
- `src/game/session/` owns React state, monotonic timing, visibility changes, snapshot pause/resume, announcements and defensive preference storage.
- Focused tests live beside their behavior. Application journeys live in `tests/e2e/`. Browser evidence and fixtures live in `artifacts/`, outside the shipped HTML.

There is no router, event bus, global store, external service, solver endpoint or diagnostic global. All authored TypeScript files stay within the specification's 200-line limit. Browser and Node compiler projects are separate; the e2e compiler additionally supplies DOM types for browser-evaluated test callbacks. Type checking is separate from Vite bundling.

## Compatibility and acceptance evidence

Validation date: **4 November 2026**. Named combination used:

| Tool | Exact version |
| --- | --- |
| Node.js | 26.12.1 |
| npm | 11.20.0 |
| React / React DOM | 19.3.1 |
| TypeScript | 7.0.2 |
| Vite | 8.3.5 |
| Vitest | 5.0.5 |
| Playwright | 1.64.1 |
| Chromium | 156.0.8078.4 |

This exact combination was tested with the locked install and commands below:

| Verification | Result |
| --- | --- |
| `npm ci` | Passed with the project lockfile and exact package pins |
| `npm run typecheck` | All three compiler projects passed |
| `npm test` | 130 tests passed across 9 files |
| `npm run test:e2e` | Fresh build passed; all 37 Chromium journeys passed (2.9 minutes) |
| `npm run build` | Passed; emitted only `dist/index.html` (238,915 bytes) |
| Valid replay command | Exit 0; only the expected snapshot on stdout; empty stderr |
| Invalid replay command | Exit 1; empty stdout; `Invalid replay.` on stderr |

All authored TypeScript/TSX files were checked at or below 200 lines (largest: 124 lines). No development servers or watchers were left running.

Unit tests cover independent literal generator vectors, all board sizes, ignored and valid turns, exact mismatch boundaries, counter caps, strict snapshot/replay input, UTF-8/action limits, CLI output/exit behavior, face identities, navigation, announcements and storage failures. Browser journeys cover every size through completion, pointer/touch/keyboard input, hidden identities, timing/reset isolation, snapshot import/export and focus, saved preferences/best scores, defensive storage, offline play, repeated announcements, reduced motion and completion motion.

Reviewable evidence, regenerated by the browser suite:

- [Keyboard accessibility-tree journey](artifacts/accessibility-journey.md): closed cards, a revealed face and completion, with one announcement per turn, native Tab exit and a subsequent new game.
- [44px grayscale face sheet](artifacts/grayscale-faces.png) and [standalone sheet HTML](artifacts/grayscale-faces.html): all 128 identities. Visual review confirmed distinct shapes, marker directions and fills, including solid/outlined squares with diagonal markers. Automated checks also verify marker distance, stroke widths, view boxes and unique rendered SVGs.
- [360x800 board](artifacts/board-360x800.png), [1280x800 board](artifacts/board-1280x800.png) and [640x400 at device scale 2](artifacts/board-640x400.png): all 256 cards, 44–88px squares, no outer horizontal overflow, first/middle/last keyboard focus outlines and real Chromium touch swipes in both scroll axes.
- [Equivalent 200% zoom completion](artifacts/zoom-win.png): 640x400 CSS pixels at device scale 2, readable controls/status/banner and playable 4x4 and 16x16 boards. This checks the specified equivalent layout rather than changing a browser's UI zoom setting.

No screen reader was used. Playwright's accessibility-tree snapshots are automated evidence; spoken output is for user acceptance. A real-device touch long press and its native context menu also remain user acceptance, as the specification states. Right-click and completed touch taps are automated. The visibility journey controls `document.visibilityState` and dispatches the native `visibilitychange` event to check pause/resume boundaries; it does not claim OS tab-occlusion automation. CSS pulse completion is checked on the rendering timeline separately from the controlled JavaScript clock.

Playwright's local HTML report and failure traces are written to ignored `playwright-report/` and `test-results/` directories. No development servers or watchers are needed for offline delivery.
