# Neon Pairs

A silent, offline memory game built to the [Neon Pairs 2.2 specification](docs/README.md). Find all pairs on boards from 4x4 through 16x16 using mouse, touch or keyboard. The game remembers the last size and best move count for each size when browser storage is available.

## Play offline

Open [dist/index.html](dist/index.html) directly in a browser. This single file contains the JavaScript, CSS and inline SVG artwork; it needs no server, network, account or external assets. Browser zoom remains enabled. Use a local HTTP origin when checking saved preferences, because storage behavior on `file:` URLs varies by browser.

Arrow keys move through the board. Enter or Space reveals a card. Tab and Shift+Tab leave the board. New Game deals fresh cards; Restart repeats the current deal.

Open **Reproduce a game** to load a board code such as `np1-4-1`, export progress as Snapshot JSON, or load a snapshot. Unfinished imports wait for **Resume**. Exported JSON can be selected and copied without clipboard permissions. Completed imports remain static and do not change local best scores.

## Commands

Use Node.js 24.19 or later and npm. Dependencies are pinned in `package.json` and `package-lock.json`.

```sh
npm ci
npm run dev
npm run typecheck
npm test
npm run test:e2e
npm run build
npm run --silent replay -- examples/pair-replay.json
```

`npm run dev` starts Vite; stop it with Ctrl+C. If Chromium is not already installed, run `npx playwright install chromium` before the browser suite. `npm run test:e2e` first typechecks and rebuilds the current source, then starts a temporary static server for that build and runs fresh browser contexts. Build failure stops the command before any browser tests. Playwright stops the server afterward.

`npm run build` typechecks both compiler projects and writes the self-contained `dist/index.html`. The replay command accepts one UTF-8 replay JSON file. It prints only the final version 1 snapshot JSON to stdout and exits 0 for valid input; invalid input produces stderr, no stdout and a nonzero exit. The [example replay](examples/pair-replay.json) finishes with one pair, one move and 800ms elapsed. Format definitions and limits are in [Reproducibility](docs/reproducibility.md).

## Code arrangement

- `src/game`: immutable deal generation, card transitions, logical time, strict snapshot validation and replay. These functions do not use browser clocks, storage, DOM or external randomness.
- `src/game/session`: React session state, monotonic active time, visibility, fresh seeds and guarded preference/best-score storage.
- `src/game/board`: native card buttons, face artwork, roving focus and arrow navigation.
- `src/game/controls`: native deal and reproduction controls; `src/Game.tsx` composes them with status and board.
- Focused tests sit beside their behavior; `tests/` holds complete application journeys. Browser and Node compiler projects are separate. All authored TypeScript files are at most 200 lines.

## Verification evidence

Verification date: 4 November 2026. The named combination is Node **26.12.1**, npm **11.20.0**, TypeScript **7.0.2**, React/React DOM **19.3.1**, Vitest **5.0.5**, Playwright **1.64.1**, Chromium **156.0.8078.4**. All other dependency versions match the exact specification pins.

| Command | Result on the named combination |
| --- | --- |
| `npm ci` | Passed locked install; zero audit findings. |
| `npm run typecheck` | Passed both strict compiler projects. |
| `npm test` | Passed 111 tests across 8 files. |
| `npm run test:e2e` | Passed all 41 fresh-build browser journeys in 3.5 minutes. |
| `npm run build` | Passed; emitted the single 239,040-byte HTML file. |
| `npm run --silent replay -- examples/pair-replay.json` | Passed; JSON-only stdout with one pair, one move and 800ms. Invalid-file exit/stdout/stderr behavior also passes unit tests. |

The final independent audit found no remaining production defects. It confirmed the architecture, strict input validation, exact lockfile pins, single-file distribution and the 200-line TypeScript limit (largest authored file: 116 lines). After strengthening checks for elapsed time staying stopped after victory and card activation staying blocked on a paused one-card snapshot, a fresh-build targeted run passed those two journeys and offline playback: 3 tests in 19.3 seconds.

The browser suite covers every supported board size through completion, move and time caps, exact 800ms mismatch timing, visibility pause/resume, obsolete timer isolation, snapshot pause/resume/round trips/errors, stable control labels and drafts, best-score persistence and storage failures, pointer/touch/keyboard input, repeated live announcements, reduced motion, 16x16 scrolling and full focus outlines, and the 200% equivalent zoom layout. Visibility is simulated using the browser platform's visibility properties and event, without app diagnostic hooks.

Durable review artifacts:

- [Complete 4x4 keyboard accessibility-tree journey](artifacts/keyboard-accessibility.txt), captured with Playwright's accessibility snapshots in Chromium 156.0.8078.4.
- [All 128 faces at 44px in grayscale](artifacts/faces-44px-grayscale.png). Visual review found each shape, fill and marker position distinguishable, including diagonal markers on solid and outline squares.
- [16x16 at 360x800](artifacts/board-16-360.png) and [1280x800](artifacts/board-16-1280.png), including the final card's complete focus outline.
- [4x4 zoom layout](artifacts/zoom-4.png) and [16x16 zoom journey](artifacts/zoom-16.png), tested at 640x400 CSS pixels and device scale 2.

No screen reader was used. Automated evidence covers the accessible names, matched state, live-region structure, full keyboard game, victory summary, native Tab exit and another game. Spoken screen-reader output and a real-device long press remain the user acceptance checks identified as outside automated delivery in the specification. Development fixtures and review artifacts are excluded from the shipped HTML.
