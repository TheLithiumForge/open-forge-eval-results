# Neon Pairs

Find every matching pair with mouse, touch, or keyboard. Open [dist/index.html](dist/index.html) directly from disk to play offline. The HTML contains all scripts, styles, and SVG artwork; it needs no server or network connection.

The implementation follows [the specification and document map](docs/README.md), version 2.2.

## Development

Use Node.js 24.19 or later and npm. Exact dependencies and the lockfile are included.

| Command | Purpose |
| --- | --- |
| `npm ci` | Install locked dependencies |
| `npm run dev` | Start the local Vite development server |
| `npm run typecheck` | Check the separate browser and Node compiler projects |
| `npm test` | Run focused unit tests |
| `npm run test:e2e` | Build current source, then run fresh-context Chromium journeys against that build |
| `npm run build` | Type check and produce the single offline HTML |
| `npm run --silent replay -- PATH` | Replay a JSON file and print only its final snapshot |

The browser command stops if its build fails. It never reuses an earlier distribution or an existing test server.

## Reproduce a game

Open **Reproduce a game** to load a board code, such as `np1-4-1`, or export and load a progress snapshot. Unfinished snapshots wait for **Resume**. Board codes repeat starting deals; snapshots preserve progress.

For the documented replay example, run:

```sh
npm run --silent replay -- evidence/replay-example.json
```

Valid replay files produce final snapshot JSON on stdout and exit 0. Invalid or unreadable files produce an error on stderr, no stdout, and a nonzero exit. [Format details](docs/reproducibility.md) define the strict version 1 formats and limits.

Preferences remember the chosen size and best moves at a local HTTP origin. Progress stays in memory until explicitly exported. Storage failures leave the session playable; browser behavior for storage on `file:` URLs varies.

## Structure

| Location | Behavior |
| --- | --- |
| `src/game/*.ts` | Pure generation, transitions, logical time, snapshot validation, and replay |
| `src/game/session/` | React session state, monotonic clock, visibility, and guarded preferences |
| `src/game/board/` | Native card buttons, focus navigation, SVG identities, and board styles |
| `src/game/controls/` | Deal and reproduction controls with their styles |
| `src/game/status/` | Score display and completion banner |
| `src/game/Game.tsx` | Application composition |
| `tests/e2e/` | Complete browser journeys and development-only evidence generation |
| `scripts/replay.ts` | Node replay command using the same pure game rules |

Focused tests live beside their behavior. All authored TypeScript and TSX files are at most 98 lines, below the 200-line limit. The shipped game contains no fixtures, diagnostic globals, solver endpoint, audio, or external assets.

## Tested compatibility and results

Tested on 4 November 2026 with **Node 26.12.1**, **npm 11.20.0**, **Playwright 1.64.1**, and **Chromium 156.0.8078.4**. These are the exact named compatibility versions from the specification. All package versions match the required pins in `package-lock.json`; other runtime combinations have not been recorded as tested.

| Check | Recorded result |
| --- | --- |
| `npm ci` | Passed with the retained lockfile |
| `npm run typecheck` | Passed for both compiler projects |
| `npm test` | 121 tests passed across 14 files |
| `npm run test:e2e` | 37 journeys passed, exit 0, after a fresh build |
| `npm run build` | Passed; `dist/index.html` is 240,575 bytes |
| `npm run dev` | Served a playable game without page errors; server stopped afterward |
| Documented replay command | Valid input: JSON-only stdout/exit 0; invalid and missing files: empty stdout, an error on stderr, exit 1 |

Browser journeys complete every supported board size, check exact active-time mismatch boundaries and pause/resume, reset callbacks, focus and keyboard play, snapshot imports/exports, saved records and storage failures, reduced motion, and completion motion. They also complete a game directly from disk with the network blocked and verify zero HTTP requests and page errors.

Large-board journeys use 360×800, 1280×800, and 640×400 at device scale 2. They check all 256 cards, minimum card dimensions, page width, middle/edge focus outlines, and actual Chromium touch swipes to reach both scroll edges. Visibility tests use a controlled monotonic clock and simulated `visibilitychange` events with the document visibility state set accordingly.

[Evidence](evidence/README.md) includes accessibility trees, exact live-region event counts, replay output, layout screenshots, and all 128 faces at 44px in grayscale. Visual review found shape, marker, and fill distinguishable, including diagonal-marker solid and outlined squares.

**No screen reader was used.** Accessibility-tree evidence was generated with Playwright 1.64.1 and Chromium 156.0.8078.4 for a complete 4×4 keyboard game, including revealed names, matched states, final moves/time, Tab exit, and another game. Spoken output and real-device touch long-press confirmation remain user acceptance as specified in [Input](docs/input.md) and [the scope notes](docs/README.md#out-of-scope).
