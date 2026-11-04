# Neon Pairs

A complete, silent memory game implementing [product specification 2.2](docs/README.md).
Open **[dist/index.html](dist/index.html)** directly in a browser. It contains all scripts,
styles and SVG artwork, works offline, and needs no server or other files.
Use a local HTTP origin for reliable preference storage; blocked storage leaves play available.

Find every pair on boards from 4x4 to 16x16. Use a mouse, touch, or Enter/Space;
arrow keys move between cards and Tab leaves the board. The timer and the 800ms
mismatch interval pause while the page is hidden. Best move counts and the chosen
size persist locally. Reload starts a fresh deal.

Expand **Reproduce a game** to load a board code, export readable snapshot JSON,
or load progress. Unfinished imports wait for Resume. Completed imports show a
static win and leave best scores unchanged. Replay remains a developer command.

```sh
npm ci
npm run dev
npm run typecheck
npm test
npm run test:e2e
npm run build
npm run --silent replay -- examples/one-pair.replay.json
```

`test:e2e` first type checks and builds current source, then tests that distribution
in fresh Chromium contexts. A failed build stops the command. The temporary local
server is managed by Playwright. The default development URL is printed by Vite.
For browser setup on a new machine, run `npx playwright install chromium`.

The replay example prints only final version 1 snapshot JSON, including one matched
pair, one move and 800 elapsed milliseconds. Invalid input produces only a stderr
message and a nonzero exit code. See the [format contract](docs/reproducibility.md)
for exact validation, caps and byte limits.

Source follows the [architecture contract](docs/architecture.md):

- `src/game/deal.ts`, `state.ts`, `turn.ts`: immutable deals, state and pure transitions.
- `src/game/snapshot.ts`, `replay.ts`, `validation.ts`: pure formats and validation.
- `src/game/session/`: React state, monotonic active clock, visibility and saved preferences.
- `src/game/board/`: native card buttons, roving focus, SVG faces and their styles.
- `src/game/controls/`: deal and reproduction controls with colocated styles.
- `src/game/Game.tsx`, `Status.tsx`: composition, status and completion.
- Behavior unit tests sit beside their implementation; browser journeys live in `tests/`.
- `scripts/replay.ts` is the Node CLI; development fixtures stay outside the distribution.

All authored TypeScript files are under 200 lines. Browser and Node compiler projects
are separate, with strictness, checked indexing, exact optional properties, verbatim
module syntax and erasable syntax enabled. Bundling follows a separate type check.

Validated on 4 November 2026 with Node **26.12.1**, npm **11.20.0**, Playwright
**1.64.1** and Chromium **156.0.8078.4**, with all package versions pinned and locked.
This exact compatibility combination passed:

| Command | Result |
| --- | --- |
| `npm ci` | Passed; 50 locked packages installed, audit found no vulnerabilities. |
| `npm run typecheck` | Passed for the browser and Node compiler projects. |
| `npm test` | Passed: 92 tests across 7 files using Vitest 5.0.5. |
| `npm run build` | Passed; one self-contained `dist/index.html`, approximately 239 kB. |
| `npm run test:e2e` | Passed: 25 fresh-context browser journeys, 4.6 minutes, after a successful fresh build. |
| `npm run --silent replay -- examples/one-pair.replay.json` | Passed; exact example snapshot on stdout. Invalid and missing files also checked for stderr-only failure and a nonzero exit. |

Browser checks cover completion at all seven sizes, ignored activations, exact
800ms mismatch timing, visibility pauses, old-timer invalidation, improved/equal/worse
best scores and reload, unavailable storage, input privacy, context menus, focus,
snapshot drafts/validation/export/import/Resume, static completed imports, reduced
motion, one completion pulse, and touch scrolling. Large-board completion uses native
Enter events; the 4x4 pointer journey and full arrow-key keyboard journey run separately.
Layouts are measured at 360x800, 1280x800 and 640x400 with device scale 2. The latter
checks the documented equivalent of 200% browser zoom. Focus outlines are checked
at the first, last and middle cards. Offline checks open the built HTML from disk
with networking disabled and verify no HTTP requests, page errors or audio use.

Automated accessibility evidence is in [keyboard-accessibility.txt](evidence/keyboard-accessibility.txt).
It records the closed board, first reveal, every matching turn, final win and
keyboard exit/new game journey using Playwright ARIA snapshots. **No screen reader
was used.** Spoken output and real-device long-press confirmation remain user
acceptance as specified in [Input](docs/input.md).

The [44px grayscale face sheet](evidence/face-sheet.html) and its
[PNG](evidence/face-sheet.png) contain all 128 actual face SVGs. Shape, marker and
fill remain distinct, including diagonal markers on solid and outlined squares.
A [mobile 16x16 screenshot](evidence/mobile-16x16.png) records the scrolling layout.
