# Neon Pairs

A silent memory game with seven board sizes, reproducible deals, saved snapshots and a deterministic replay CLI. The requirements are in [docs/README.md](docs/README.md).

Open **[dist/index.html](dist/index.html)** directly in a browser to play offline. This is the complete distribution: scripts, styles and SVG artwork are inline, with no network requests or companion files. Serve the game over HTTP when checking persisted preferences and best scores.

Choose Grid size, then use New Game for a fresh deal or Restart for the same deal. Click, tap, or use the arrow keys with Enter/Space. Tab leaves the board. Every face has a distinct shape, marker and fill, so color isn't required.

Expand **Reproduce a game** to load a board code or export/import progress. Export fills the Snapshot JSON textarea for manual copying. Unfinished imports wait for Resume; completed imports show a static result without changing the local best. Export a snapshot to keep progress across reloads. Only grid size and best scores are saved automatically.

## Build and commands

Requires Node.js 24.19 or later and npm. All specified packages are pinned in package.json and package-lock.json. Browser and Node TypeScript projects have separate configurations and strict checks.

```sh
npm ci
npx playwright install chromium
npm run dev
```

Stop the development server with Ctrl+C. The browser download is needed only for running browser tests.

| Command | Result |
| --- | --- |
| `npm ci` | Install locked dependencies |
| `npm run dev` | Start the development server |
| `npm run typecheck` | Check both compiler projects |
| `npm test` | Run focused unit and CLI tests |
| `npm run test:e2e` | Build current source, then run browser journeys against that build |
| `npm run build` | Type check and generate the single offline HTML |
| `npm run --silent replay -- PATH` | Validate and replay a file, printing only its final snapshot |

The browser command stops immediately on a build failure. Its temporary HTTP server and browser contexts are cleaned up automatically. It does not reuse an existing server or an old build.

For an example replay:

```sh
npm run --silent replay -- examples/one-pair.replay.json
```

It finishes `np1-4-1` with positions 0 and 11 matched, one move and 800 elapsed milliseconds. Invalid files produce no stdout, write an error to stderr and exit nonzero. [The sample snapshot](examples/pending-mismatch.snapshot.json) restores a mismatch with 300 active milliseconds remaining. The exact version 1 formats and limits are in [Reproducibility](docs/reproducibility.md).

## Code arrangement

- `src/game/boardCode.ts`, `state.ts`, `selection.ts`, `snapshot.ts`, `replay.ts` and `validation.ts`: pure generation, transitions, time and format validation.
- `src/game/session/`: React state, monotonic browser timing, visibility, fresh seeds, announcements and optional storage. Pending callbacks check the deal generation and are canceled on cleanup. Logical time is retained precisely; React renders when visible values change.
- `src/game/board/`: native card buttons, inline SVG faces, remembered board focus and arrow navigation. Hidden cards never mount face SVGs or expose face identity in DOM attributes or names.
- `src/game/controls/`: deal and reproduction controls, including editable drafts.
- `src/game/Game.tsx`: composition; `Status.tsx`: counters and completion banner. Component props and CSS live beside their components.
- `scripts/replay.ts`: Node-only file I/O around the same pure replay function.
- Focused tests live beside their behavior; `tests/` holds complete browser journeys. Examples, tests and evidence are excluded from the shipped HTML. All authored TypeScript files are below 200 lines.

Saved preferences use only the `neon-pairs.preferences.v1` localStorage key. Reads, JSON parsing and writes are guarded; invalid entries are ignored and unavailable storage leaves the session playable.

## Verification

Validation environment: Linux, Node **26.12.1**, npm **11.20.0**, Playwright **1.64.1**, Chromium **156.0.8078.4**. Package versions match Technology T02, including React **19.3.1**, TypeScript **7.0.2**, Vite **8.3.5** and Vitest **5.0.5**.

| Check | Result |
| --- | --- |
| Locked `npm ci` | Passed |
| `npm run typecheck` | Passed, browser and Node projects |
| `npm test` | Passed, 88 tests in 7 files |
| `npm run build` | Passed, single inline `dist/index.html` |
| `npm run test:e2e` | Passed, all 26 browser journeys; 6 affected journeys passed again after the final keyboard refinement |
| Example replay command | Passed, final snapshot only |

The named compatibility combination above was tested on 4 November 2026. The final keyboard refinement preserves browser defaults for modifier combinations while ignoring their card activation; its focused rerun rebuilt the delivered HTML and rechecked keyboard, pointer, touch, zoom and offline play.

Unit checks include independent literal deck vectors (including a rejected random draw), every size, transition timing, counter caps, strict unknown-input validation, snapshot round trips, UTF-8 limits, safe-integer timelines, equal-time replay actions and CLI stdout/stderr behavior.

Browser journeys cover complete games at every size; reset during a mismatch; visibility suspension; snapshots, paused input and Resume focus; repeated live announcements; persisted sizes and better/equal/worse best scores; storage failure; concealed identities; pointer, keyboard and touch; reduced motion; internal scrolling; and the offline HTML opened from disk with network blocked. Visibility is simulated by changing the browser document's visibility value and dispatching its standard event; time-boundary tests use Playwright's controlled clock.

Automated accessibility-tree evidence for the full 4x4 keyboard game is in [evidence/keyboard-accessibility.txt](evidence/keyboard-accessibility.txt), captured with the Playwright/Chromium versions above. It includes initial closed positions, revealed face names, completed results and starting another game. **A screen reader was not used.** Spoken output and real-device long-press context menus remain the user acceptance checks specified in Input.

The [44px grayscale face sheet](evidence/faces-44px-grayscale.png) captures all 128 actual SVG faces for visual review. Layout evidence covers [360×800](evidence/board-360x800.png), [1280×800](evidence/board-1280x800.png) and [640×400](evidence/board-640x400.png). An additional browser journey checks 640×400 at device scale 2, the specified 200% zoom equivalent. [Offline evidence](evidence/offline-desktop.png) comes from the standalone file.
