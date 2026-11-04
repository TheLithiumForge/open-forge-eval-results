# Neon Pairs
Find every matching pair in a quiet, offline memory game. Implements the [version 2.2 product specification](docs/README.md), including all seven sizes, board codes, saved snapshots and the replay command.

Open **[dist/index.html](dist/index.html)** directly in a browser. The single file includes React, styles and SVG artwork and needs no network connection. Use a local HTTP origin to check persistent size preferences and best scores; storage behavior on `file:` URLs varies by browser. Active progress stays in memory until exported as a snapshot.

## Development

Requires Node.js 24.19 or later and npm. Dependencies are pinned in `package.json` and `package-lock.json` exactly as specified in [Technology](docs/technology/technology.md).

```sh
npm ci
npm run dev
npm run typecheck
npm test
npx playwright install chromium
npm run test:e2e
npm run build
```

`npm run build` checks both compiler projects and creates the offline HTML. `npm run test:e2e` first builds from current source and stops on a build failure, then serves that artifact in fresh browser contexts. It also opens the artifact from disk with network access blocked. The test server stops when the suite ends. Linux hosts may need Playwright's Chromium system dependencies (`npx playwright install --with-deps chromium`).

## Repeat a game

Expand **Reproduce a game** to load a board code such as `np1-4-1`, export progress to **Snapshot JSON**, or paste and load an existing snapshot. Unfinished imports wait for **Resume**. Completed imports show a static result and leave local best scores intact.

Replay a file with the documented command:

```sh
npm run --silent replay -- tests/fixtures/pair.replay.json
```

This example prints only a version 1 snapshot with positions 0 and 11 matched, one move and 800 elapsed milliseconds. Invalid input produces stderr, no stdout and a nonzero exit status. [Reproducibility](docs/sharing/reproducibility.md) defines the exact formats and validation limits.

## Code arrangement

- `src/game`: pure deterministic generation, immutable board descriptions, turn transitions, logical time, snapshot validation and replay; focused tests sit beside each behavior.
- `src/game/session`: React session state, monotonic timing, visibility, timer cleanup, preferences and best scores. Browser effects stay here.
- `src/game/board`: native card buttons, roving keyboard focus, SVG faces and board styles.
- `src/game/controls`: deal controls and reproduction controls, with their props and styles.
- `src/game/Game.tsx`: composition, statistics, completion banner and the single live region.
- `tests`: complete browser journeys and development-only evidence; `scripts/replay.ts` adapts files and process output to the pure replay function.

Browser and Node compiler projects are separate. Both enable strictness, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `verbatimModuleSyntax` and `erasableSyntaxOnly`. Every authored TypeScript/TSX file is below the 200-line limit. The distribution contains no fixtures, diagnostic globals, audio or external assets.

## Verification

Tested on 4 November 2026 using the named compatibility combination: **Node 26.12.1, npm 11.20.0, Playwright 1.64.1 and Chromium 156.0.8078.4**. The locked install, type check, production build, unit tests and browser journeys were run with these versions.

| Command | Result |
| --- | --- |
| `npm ci` | Passed; installed the locked, pinned dependencies |
| `npm run typecheck` | Passed both compiler projects |
| `npm test` | 77 tests passed across 6 files |
| `npm run test:e2e` | Fresh build succeeded; all 25 browser journeys passed |
| `npm run build` | Passed; single `dist/index.html`, approximately 242 kB |
| `npm run --silent replay -- tests/fixtures/pair.replay.json` | Passed; only the expected snapshot JSON on stdout |

The unit suite checks the independent published generator/deck vectors, complete pairs for every size, exact logical deadlines, move/time caps, snapshot schemas and byte limits, replay ordering and storage failure handling. Browser journeys check all sizes through completion, native pointer/touch/keyboard input, focus edges and Tab exit, repeated announcements, invalid loads, paused and completed imports, replay CLI output, best-score persistence and offline play. The visibility journey connects to Chromium without Playwright's forced-visible-tab defaults, then switches actual tabs to test both clocks.

Automated accessibility evidence for the complete 4x4 keyboard journey is saved in [accessibility.txt](tests/evidence/accessibility.txt) and Chromium's [native accessibility tree](tests/evidence/accessibility-tree.json), covering closed positions, a revealed face, matched cards, completion and final statistics. Browser/tool versions are included. **No screen reader was used.** Spoken output and real-device long-press context menus remain the user acceptance checks specified in [Input](docs/interface/input.md).

Visual evidence includes the [44px grayscale sheet of all 128 faces](tests/evidence/faces-44px-grayscale.png) and layouts at [360×800](tests/evidence/layout-360.png), [1280×800](tests/evidence/layout-1280.png) and [640×400 at device scale 2](tests/evidence/layout-640.png). The grayscale sheet was visually reviewed, including diagonal markers on solid and outlined squares. Layout journeys measure page width, card targets and complete focus outlines at the first, middle and last cards. Reduced motion and the single 600ms completion pulse are checked.
