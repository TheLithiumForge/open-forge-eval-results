# Neon Pairs
Find every matching pair on a 4x4 through 16x16 board. Play the finished game by opening [dist/index.html](dist/index.html) directly from disk. Its script, styles and SVG artwork are embedded; play needs no network connection and stays silent.

Click or tap a card, or use arrow keys to move and Enter/Space to reveal it. Tab leaves the board. New Game creates another deal; Restart repeats the current board code.

Open **Reproduce a game** to load a board code, export progress as readable JSON, or load a snapshot. Unfinished snapshots wait for Resume. Active progress stays in memory; only the chosen size and best moves are saved automatically when storage is available. Serve the game locally when checking saved preferences because `file:` storage behavior differs by browser.

## Development

Use Node.js 24.19 or later and npm. Exact dependency pins are in [package.json](package.json) and [package-lock.json](package-lock.json). After installation, install the pinned Playwright browser once with `npx playwright install chromium` if it is not already available.

| Command | Purpose |
| --- | --- |
| `npm ci` | Install the locked dependencies |
| `npm run dev` | Start the local development server |
| `npm run typecheck` | Check browser, Node and test compiler projects |
| `npm test` | Run colocated rule, format, session and component unit tests |
| `npm run test:e2e` | Build current source, then run browser journeys in fresh contexts |
| `npm run build` | Type check and emit the single offline HTML file |
| `npm run --silent replay -- PATH` | Validate a replay and print its final snapshot |

For example, `npm run --silent replay -- examples/replay.json` reads the [documented example](examples/replay.json) and prints a snapshot with one pair, one move and 800 elapsed milliseconds. Invalid replay input prints no stdout, reports an error on stderr and exits nonzero. Replay has no in-game controls.

The [specification](docs/README.md) defines the game. Code follows [Architecture](docs/architecture.md): pure transitions, generation and codecs live under `src/game`; browser effects and saved preferences under `src/game/session`; board navigation/artwork under `src/game/board`; native controls under `src/game/controls`. `Game.tsx` composes the interface. Focused tests and styles sit beside their behavior; full browser journeys live in `tests`.

## Validation

Tested on 4 November 2026 with the named compatibility combination: **Node.js 26.12.1, npm 11.20.0, Playwright 1.64.1 and Chromium 156.0.8078.4**. All documented dependency pins match the locked install. Other browser/runtime combinations have not been tested.

| Check | Result |
| --- | --- |
| `npm ci` | Passed; lockfile unchanged |
| `npm run typecheck` | Passed all three strict compiler projects |
| `npm test` | 129 tests passed across 12 files |
| `npm run build` | Passed; `dist` contains only the 240,384-byte `index.html` |
| `npm run test:e2e` | 35 browser journeys passed, including its fresh build |
| Replay command | Valid example and invalid-input stdout/stderr/exit contract passed |
| Architecture audit | 55 authored TypeScript files; largest 118 lines; none over 200 |

Browser journeys complete every supported size, cover native pointer/touch/keyboard actions and accessible names, check repeated announcements, exact active-time pauses, reset safety, snapshot validation/Resume, caps, saved preferences/bests, unavailable storage, motion and offline play. Visibility timing uses controlled browser time and simulated visibility events. Browser tests use two workers to fit the environment's resources.

Evidence generated from the built game:

- [Keyboard accessibility-tree journey](evidence/accessibility-tree.txt), including revealed names, turn announcements, the win and a new game.
- [All 128 faces in grayscale at 44px](evidence/faces-44px-grayscale.png), visually reviewed including solid/outline squares with diagonal markers.
- [Blocked-network offline check](evidence/offline-check.json): only the HTML file was requested; no network requests or page errors, with audio APIs trapped throughout completion and reset.
- Layouts at 360x800: [4x4](evidence/layout-360-4.png), [16x16](evidence/layout-360-16.png); 1280x800: [4x4](evidence/layout-1280-4.png), [16x16](evidence/layout-1280-16.png); 640x400 at device scale 2: [4x4](evidence/layout-640-4.png), [16x16](evidence/layout-640-16.png). All keep the page within the viewport, cards at least 44px square, and complete focus outlines in view. Touch scrolling reaches both ends of 16x16 boards at both required viewport widths.

No screen reader was used. Spoken output and a real device's long-press context menu remain user acceptance checks, as specified in [Input](docs/input.md) and [Acceptance](docs/acceptance.md).
