# Neon Pairs

Find every matching pair in this silent, offline memory game. The complete product requirements start in [docs/README.md](docs/README.md).

Use Node.js 24.19 or later and npm. Install the exact locked dependencies with `npm ci`.
If Chromium is not installed, run `npm exec playwright -- install chromium` before the browser checks.

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the local development server |
| `npm run typecheck` | Check the separate browser and Node compiler projects |
| `npm test` | Run colocated game-rule and replay CLI tests |
| `npm run build` | Type check, then produce the self-contained `dist/index.html` |
| `npm run test:e2e` | Build current source, then run fresh-context Chromium journeys against that build |
| `npm run --silent replay -- examples/replay.json` | Print the example replay's final snapshot JSON |

Open `dist/index.html` directly from disk to play offline. The HTML includes the application, styles and SVG artwork. For persisted preferences and best scores, use a local HTTP origin; browsers differ in storage support for `file:` URLs. Storage failures leave the current game playable.

The replay command accepts one file path. Valid input produces only the final version 1 snapshot on stdout and exits 0. Invalid input produces no stdout, an error on stderr and a nonzero exit code. [Reproducibility](docs/reproducibility.md) defines the strict board-code, snapshot and replay formats.

The implementation keeps pure rules and formats under `src/game`, browser effects under `src/game/session`, navigation and artwork under `src/game/board`, and controls under `src/game/controls`. Browser tests live under `tests`; no test fixtures or diagnostic helpers are bundled into the game.

## Acceptance evidence

- [Keyboard accessibility trees and turn announcements](evidence/accessibility.md) record a complete 4x4 keyboard game, native Tab exit and a new deal.
- [44px grayscale face sheet](evidence/faces-grayscale.html) and its [image](evidence/faces-grayscale.png) show all 128 identities, including diagonal square markers. The sheet was visually reviewed.
- [Desktop](evidence/game-desktop.png) and [phone](evidence/game-phone.png) screenshots show the mounted game.

The browser suite checks every board size, pointer and keyboard actions, native touch scrolling and tapping, paused snapshot restoration, best-score persistence and storage failures. It measures card size, board overflow and complete focus outlines at 360x800, 1280x800 and 640x400 CSS pixels; the last uses device scale 2 for the documented zoom-equivalent layout. It also checks reduced motion, the single completion pulse and offline disk play with networking blocked.

Timing checks use Playwright's controlled browser clock. Visibility lifecycle coverage injects `document.hidden` values and dispatches `visibilitychange`; it verifies that the session excludes hidden time and preserves the pending mismatch interval. Touch scrolling uses Chromium CDP touch start, move and end events inside the viewport.

## Validation record

Tested on 4 November 2026 with Node.js **26.12.1**, npm **11.20.0**, Playwright **1.64.1**, and Chromium **156.0.8078.4**. This named compatibility combination passed:

| Command | Result |
| --- | --- |
| `npm ci` | Locked installation with all documented package pins |
| `npm run typecheck` | Browser and Node projects passed, including tests |
| `npm test` | 12 files, 121 tests passed |
| `npm run build` | One self-contained `dist/index.html`, 240982 bytes |
| `npm run test:e2e` | Fresh build, 33 browser journeys passed in fresh contexts |
| `npm run --silent replay -- examples/replay.json` | Final snapshot with matched positions `[0,11]`, one move and 800 elapsed milliseconds |

The browser suite uses one Chromium worker to stay within constrained host thread limits. The final HTML completed a game and restarted directly from disk in an offline context with zero HTTP requests and no page errors. Other Node/npm/browser combinations have not been recorded as tested.

No screen reader was used during development. The automated accessibility-tree evidence records the browser and tool versions. Spoken screen-reader output and real-device touch long-press remain user acceptance checks under the specification.
