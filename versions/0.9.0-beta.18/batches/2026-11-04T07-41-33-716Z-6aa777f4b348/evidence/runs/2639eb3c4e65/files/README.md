# Neon Pairs

A silent, offline memory game implementing [specification 2.2](docs/README.md), with seven board sizes, repeatable deals, progress snapshots and a developer replay command.

Open [dist/index.html](dist/index.html) directly in a browser to play. Everything needed is inside that file; it makes no network requests. Use a local HTTP origin to check persistent preferences because browser storage behavior varies on `file:` URLs.

## Build and test

Use Node.js 24.19 or later and npm. Dependencies are pinned to the versions in [Technology](docs/technology.md) and recorded in `package-lock.json`.

```sh
npm ci
npm run dev
npm run typecheck
npm test
npm run test:e2e
npm run build
```

`dev` starts Vite; stop it with Ctrl+C. `build` checks both compiler projects and emits the single offline HTML file. `test:e2e` builds current source first and runs Chromium journeys against that build in fresh browser contexts; a failed build stops the command. Its local server exits with the test runner.

On a new machine, install the browser before running browser tests:

```sh
npx playwright install chromium
```

On Linux systems missing browser libraries, use `npx playwright install --with-deps chromium`.

## Play and reproduce

Reveal two cards with a click, tap, Enter or Space. A match stays open; a miss closes after 800 active milliseconds. Arrow keys move between positions without revealing cards. Tab leaves the board and remembers the last position. Hidden pages pause both the game clock and pending misses.

New Game deals a new board. Restart repeats the current board. Grid size and each size's best move count persist when storage is available; progress stays in memory until exported. The game remains playable when storage fails.

Expand **Reproduce a game** to load a board code or export/import Snapshot JSON. Try `np1-4-1` for the specification's known deal. Export fills the textarea for manual copying. Imported unfinished snapshots await Resume; completed snapshots show a static result without changing best scores.

Replay runs outside the UI:

```sh
npm run --silent replay -- examples/first-pair.replay.json
```

This example prints a final version 1 snapshot with matched positions `[0, 11]`, one move and 800 elapsed milliseconds. Valid input produces only snapshot JSON on stdout and exit 0. Invalid input, a missing file or an oversized replay produces a stderr message, empty stdout and a nonzero exit. [Reproducibility](docs/reproducibility.md) defines the strict board, snapshot and replay formats and limits.

## Code structure

The implementation follows [Architecture](docs/architecture.md):

| Location | Responsibility |
| --- | --- |
| `src/game/deck.ts` | Canonical board codes and deterministic Park–Miller shuffle |
| `src/game/model.ts`, `transitions.ts` | Typed state, turns, logical active time, limits and victory |
| `src/game/snapshot.ts`, `replay.ts`, `validation.ts` | Pure validation, snapshot encoding and replay |
| `src/game/session/` | React state, monotonic browser time, visibility, pause, preferences and records |
| `src/game/board/` | DOM cards, SVG identities, roving focus and navigation |
| `src/game/controls/` | Native deal and reproduction controls with drafts |
| `src/game/Game.tsx`, `Status.tsx` | Composition, visible status and completion |
| `scripts/replay.ts` | File input and CLI exit/output behavior |
| `tests/` | Complete browser journeys against built HTML |

Focused unit tests and component styles live beside their behavior. All authored TypeScript files are below 200 lines. Pure rules import no browser effects, clocks, storage or external randomness. Hidden cards mount no face identity, and the shipped app exposes no diagnostic or solver API.

## Verification evidence

Compatibility environment: Node **26.12.1**, npm **11.20.0**, Playwright **1.64.1**, Chromium **156.0.8078.4**. React **19.3.1**, TypeScript **7.0.2**, Vite **8.3.5** and Vitest **5.0.5** are locked with the other required packages. No other browser/version combination is claimed tested.

Results on 4 November 2026 with that exact combination:

| Command | Result |
| --- | --- |
| `npm ci` | Passed; installed the locked dependencies |
| `npm run typecheck` | Passed; browser and Node projects checked |
| `npm test` | Passed; 107 tests in 6 files |
| `npm run test:e2e` | Passed; fresh build and all 24 browser journeys |
| `npm run build` | Passed; self-contained `dist/index.html`, approximately 233 KiB |
| `npm run --silent replay -- examples/first-pair.replay.json` | Passed; snapshot JSON only, exit 0 |

The CLI's malformed-input and missing-file checks also passed with empty stdout and nonzero exits. All test servers and watchers were stopped after verification.

The browser suite covers completing every size; exact logical mismatch timing; page visibility; stale timer invalidation; pointer, touch and keyboard actions; remembered focus; consecutive announcements; snapshot pause/Resume and static completed imports; best-score persistence and storage failure; offline disk play with networking disabled; and replay stdout, stderr and exit codes. Layout checks cover 16×16 at 360×800 and 1280×800, plus 640×400 at device scale 2 for the specified equivalent zoom layout.

- [Accessibility-tree evidence](evidence/accessibility.txt) records a complete 4×4 keyboard game, first reveal, first match, win and another game.
- [Grayscale face sheet](evidence/face-sheet.html) and [PNG](evidence/face-sheet.png) show all 128 identities at 44px, including solid and outlined squares with diagonal markers.
- [Desktop](evidence/game-desktop.png) and [phone](evidence/game-mobile.png) screenshots record the initial layout.

No screen reader was used. Spoken announcements and a physical device's long-press context menu remain user acceptance checks, as specified in [Input](docs/input.md) and the [scope](docs/README.md#out-of-scope).
