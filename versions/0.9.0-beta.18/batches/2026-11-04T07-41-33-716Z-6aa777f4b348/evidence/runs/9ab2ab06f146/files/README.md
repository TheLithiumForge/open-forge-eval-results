# Neon Pairs

A silent, offline memory game built to [specification 2.2](docs/README.md).
Find every pair on boards from 4x4 to 16x16, using mouse, touch or keyboard.

Open **[dist/index.html](dist/index.html)** directly in a browser. All JavaScript,
CSS and SVG artwork are embedded; playing needs no server or network access.
For reliable saved preferences and best scores, serve the game on a local HTTP
origin. If browser storage is unavailable, the current session remains playable.

## Build and run

Use Node.js 24.19 or newer and npm. Dependencies are pinned in `package.json` and
`package-lock.json`.

```sh
npm ci
npm run dev
npm run typecheck
npm test
npx playwright install chromium
npm run test:e2e
npm run build
```

`dev` starts Vite on port 5173. `typecheck` checks the separate browser and Node
compiler projects. `test` runs the pure rule tests once. `test:e2e` first builds
current source, then opens fresh Chromium contexts against that build. Its HTTP
server on port 4173 exits with the tests. A failed build stops the browser command.
`build` type checks and produces the single offline HTML file.

## Play and reproduce

Choose **Grid size**, then reveal two cards. A match stays open; a miss closes
after 800 active milliseconds. **New Game** creates another deal; **Restart**
repeats the current one. Best move counts and the chosen size survive reloads.
Progress stays in memory until explicitly exported.

Tab enters the board at its remembered card. Arrow keys move without wrapping;
Enter or Space reveals a card. Tab leaves the board. Matched cards remain
focusable. Page visibility pauses active time and the mismatch interval.

Expand **Reproduce a game** to load a board code such as `np1-4-1`, or export and
load version 1 snapshot JSON. Unfinished imports wait for **Resume**; completed
imports show a static result and do not change best scores. Invalid input keeps
the current game and the draft. Copy exported JSON manually from its textarea.
[examples/snapshot.json](examples/snapshot.json) contains the documented pending
mismatch example.

Replay is available in the pure game core and CLI:

```sh
npm run --silent replay -- examples/replay.json
```

This prints only a final snapshot JSON on stdout and exits 0. The included replay
ends with matched positions `[0,11]`, one move and 800 elapsed milliseconds.
Invalid input or an unreadable file prints an error to stderr, leaves stdout
empty and exits nonzero. [Format documentation](docs/reproducibility.md) defines
board codes, snapshot validation, replay timestamps and input limits.

## Code arrangement

- `src/game/board.ts`, `state.ts`, `activate.ts`, `advance.ts`: immutable deals,
  card transitions and logical time, with no browser effects.
- `src/game/snapshot*.ts`, `replay.ts`, `validation.ts`: pure format processing.
- `src/game/session`: React session state, monotonic timing, visibility,
  preferences, best scores and announcements.
- `src/game/board`: native card buttons, SVG faces, roving focus and scrolling.
- `src/game/controls`: deal controls and the native reproduction disclosure.
- `src/Game.tsx`: composition of status, board and controls.
- Focused tests sit beside their behavior; `tests/` contains browser journeys.
  `scripts/replay.ts` uses the same pure rules as the UI.

All authored TypeScript files are below the 200-line limit. The shipped game
contains no test fixtures, diagnostic globals, replay UI, remote assets or audio.

## Verification

Verified on 4 November 2026 with **Node 26.12.1**, **npm 11.20.0**,
**Playwright 1.64.1** and **Chromium 156.0.8078.4** (headless Chromium on Linux).
The locked install uses all exact package versions in [Technology](docs/technology.md).

| Command | Recorded result |
| --- | --- |
| `npm ci` | Passed; locked dependencies installed |
| `npm run typecheck` | Passed for browser and Node projects |
| `npm test` | 89 tests passed in 6 files |
| `npm run build` | Passed; one `dist/index.html`, 240119 bytes |
| `npm run test:e2e` | Fresh build passed; 29 browser journeys passed in 3.5 minutes |
| `npm run --silent replay -- examples/replay.json` | Exit 0; exact documented final snapshot; invalid and missing files also checked |

Browser coverage includes completion at every size, keyboard navigation and
native Tab exit, pointer and touch activation, real touch scrolling, hidden face
identity, repeated announcements, paused imports, visibility timing, stale timer
invalidation, score/time caps, saved preferences, best-score changes, unavailable
storage, reduced motion, the 600ms victory pulse, CLI behavior and silent play.
Timing assertions use a paused browser clock; visibility tests dispatch the
visibility event with the document's hidden state controlled by the test.

The built HTML was opened from disk with HTTP/HTTPS requests blocked and played
through completion with zero network requests and no page errors. Storage
journeys used the local HTTP origin. Layout checks cover 360x800, 1280x800 and
640x400 at device scale 2, including both 4x4 and 16x16 boards, reachable controls,
card dimensions, contained scrolling and complete focus outlines.

The [accessibility-tree evidence](docs/evidence/accessibility-journey.txt) records
the complete 4x4 keyboard journey using Playwright's `ariaSnapshot()` tool,
including closed and revealed names, matched states, completion and a new game.
**No screen reader was used.** Spoken results and the real-device long-press
context menu remain user acceptance checks as specified in [Input](docs/input.md).

Visual evidence includes the reviewed [44px grayscale face sheet](docs/evidence/faces-44px-grayscale.png)
and [phone](docs/evidence/layout-360.png), [desktop](docs/evidence/layout-1280.png)
and [200% equivalent zoom](docs/evidence/layout-640-2x.png) captures.
The tests regenerate these artifacts under `test-results/`; the retained copies
are in [docs/evidence](docs/evidence/README.md).
