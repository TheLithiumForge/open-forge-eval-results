# Neon Pairs
Find matching pairs on seven board sizes, from 4x4 through 16x16. Play with mouse, touch or keyboard. The game is silent and uses no external assets or services.

Open [dist/index.html](dist/index.html) directly to play offline. It contains all scripts, styles and SVG artwork in one file. Use an HTTP origin, such as the development server, when checking saved grid preferences and best scores; browsers handle storage differently on `file:` URLs. Storage failures leave the game playable.

The requirements are defined by [specification 2.2](docs/README.md).

## Run and build

Use Node.js 24.19 or later and npm. Dependencies are pinned in `package.json` and `package-lock.json`.

| Command | Result |
| --- | --- |
| `npm ci` | Install the locked dependencies |
| `npm run dev` | Start the local development server |
| `npm run typecheck` | Check browser, Node and browser-test compiler projects |
| `npm test` | Run colocated game-rule and behavior unit tests |
| `npm run build` | Type check and produce the standalone `dist/index.html` |
| `npm run test:e2e` | Build current source, then check that build in fresh Chromium contexts |
| `npm run --silent replay -- PATH` | Replay a version 1 JSON file |

If Chromium is not installed on another machine, run `npx playwright install chromium` before browser tests. Browser tests serve the built HTML on `127.0.0.1:4173`; the offline journey also opens it from disk with network access blocked. The browser command stops if its build fails and never uses an earlier distribution as a fallback.

## Repeat or save a game

Expand **Reproduce a game** to load a board code, such as `np1-4-1`, or export and load **Snapshot JSON**. A board code repeats a hidden deal; a snapshot saves its progress. Unfinished imports wait for **Resume**. Completed imports preserve the saved best score and show a static win banner.

Replay remains a developer command. For the documented example, run:

```sh
npm run --silent replay -- tests/fixtures/replay-valid.json
```

It exits 0 and prints only the final snapshot JSON: one pair, one move and 800 elapsed milliseconds. Invalid input produces no stdout, writes an error to stderr and exits nonzero. [Format rules](docs/reproducibility.md) define validation and limits.

## Structure

| Location | Responsibility |
| --- | --- |
| `src/game/deck.ts`, `state.ts`, `snapshot.ts`, `replay.ts` | Pure generation, game transitions, logical time and versioned formats |
| `src/game/session/` | React state, monotonic browser timing, visibility, preferences, bests and announcements |
| `src/game/board/` | Card artwork, names, focus navigation and board layout |
| `src/game/controls/` | Native deal and reproduction controls |
| `src/game/Game.tsx` | Compose controls, status and board |
| `scripts/replay.ts` | Read a file and run the same pure replay core |
| `tests/` | Complete browser journeys and test-only fixtures |

Focused unit tests sit beside their behaviors. Browser effects stay outside the pure core. Hidden cards expose no face identity in their DOM. Test fixtures and evidence helpers are excluded from the distribution. Every authored TypeScript file is below the 200-line limit in [Architecture](docs/architecture.md) and [Technology](docs/technology.md).

## Verification recorded 4 November 2026

Tested together: **Node 26.12.1**, **npm 11.20.0**, **Playwright 1.64.1** and **Chromium 156.0.8078.4**. TypeScript is **7.0.2** and Vitest is **5.0.5**. The locked install uses every package version specified in [Technology](docs/technology.md).

| Check | Result |
| --- | --- |
| `npm ci` | Passed; locked installation |
| `npm run typecheck` | Passed across all three compiler projects |
| `npm test` | 80 tests passed in 8 files |
| `npm run build` | Passed; one self-contained HTML file |
| `npm run test:e2e` | 39 acceptance tests passed, including 3 CLI cases |
| `npm run test:e2e -- --grep 'touch scrolling'` | Fresh build; all 3 strengthened gesture checks passed |
| Replay valid / invalid / missing file | Correct JSON stdout or empty stdout with nonzero exit |

Browser coverage includes every board size, exact 800ms active mismatch timing, simulated visibility changes, stale timer invalidation, snapshot pause/resume and caps, better/equal/worse persisted bests, unavailable storage, native pointer and keyboard actions, touch taps and raw touch scrolling. Layout checks cover 360x800, 1280x800 and 640x400 at device scale 2, with first, middle and last focus outlines visible. Checks also cover hidden-card identity, distinct updates for identical live announcements, reduced motion, one completion pulse and blocked-network disk play.

The [keyboard accessibility-tree evidence](evidence/keyboard-accessibility.txt) records named controls, closed and revealed cards, consecutive misses, a complete keyboard game, the final announcement, native Tab exit and another game. The [44px grayscale face sheet](evidence/faces-grayscale.png), also available as [standalone HTML](evidence/faces-grayscale.html), contains all 128 identities; shape, marker and fill remain distinguishable, including diagonal-marker solid and outlined squares.

**No screen reader was used.** The evidence was collected with Playwright's accessibility-tree snapshots in the Chromium version above. Spoken screen-reader output and a real-device long-press context menu remain user acceptance checks, as specified in [Input](docs/input.md) and the specification's exclusions.
