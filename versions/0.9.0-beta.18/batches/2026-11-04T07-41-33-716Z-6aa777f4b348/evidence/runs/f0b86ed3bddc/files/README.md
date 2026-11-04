# Neon Pairs

A silent memory game built with React, TypeScript, native controls and inline SVG. Find every pair on boards from 4x4 through 16x16. The complete product contract is in [docs/README.md](docs/README.md).

## Run and build

Use Node.js 24.19 or later and npm. Dependencies are pinned in [package.json](package.json) and [package-lock.json](package-lock.json).

```sh
npm ci
npm run dev
```

```sh
npm run typecheck
npm test
npm run test:e2e
npm run build
```

`npm run test:e2e` builds current source first and stops if the build fails. It starts a temporary local server for the built HTML, creates fresh browser contexts, checks the file URL separately with network access blocked, and stops the server on exit. Install the matching browser with `npx playwright install chromium` if needed.

`npm run build` type checks both compiler projects and writes **[dist/index.html](dist/index.html)**. Open that one file directly from disk to play offline. Its scripts, styles and artwork are embedded. Playing needs no network access, account or external assets. System fonts and browser zoom are preserved.

## Play and reproduce

Choose **Grid size**, then reveal two cards with clicks, taps, Enter or Space. Arrow keys move between cards without wrapping. Tab enters at the remembered card and leaves the board normally. Matches stay revealed; misses close after 800 active milliseconds. The clock and pending misses pause while the page is hidden. **Restart** repeats the deal; **New Game** creates a fresh code.

Expand **Reproduce a game** to load a board code, such as `np1-4-1`. **Export snapshot** fills the JSON textarea with current progress for manual copying. **Load snapshot** validates the entire draft, then pauses unfinished games until **Resume**. Completed imports show a static win summary. Invalid input preserves the game and draft.

Only the selected size and best moves per size are saved automatically, under `neon-pairs.preferences.v1`. Progress stays in memory until exported. Preference persistence is checked over HTTP because file-URL storage behavior varies by browser. Storage failures leave play available.

Replay is available through the pure game core and CLI:

```sh
npm run --silent replay -- examples/first-pair.replay.json
```

The [example replay](examples/first-pair.replay.json) prints a version 1 snapshot with matched positions `[0, 11]`, one move and 800 elapsed milliseconds. Valid replay output is snapshot JSON alone on stdout. Errors go to stderr with a nonzero exit status and empty stdout. The versioned algorithms, strict schemas and limits are in [Reproducibility](docs/reproducibility.md).

## Code arrangement

- `src/game/`: pure board-code parsing, exact deck generation, immutable board descriptions, turns, logical time, snapshot validation and replay. These functions receive all inputs directly.
- `src/game/session/`: React game state, monotonic browser time, visibility, timer cleanup, fresh seeds, load orchestration and validated preferences.
- `src/game/board/`: native card buttons, conditional face SVGs, face descriptions, remembered keyboard focus and scrolling.
- `src/game/controls/`: native deal controls and reproduction drafts.
- `src/game/Game.tsx`: composes controls, status, board, pause and completion feedback.
- `scripts/`: replay CLI and the temporary built-HTML test server.
- `tests/e2e/`: complete application journeys. Focused unit tests sit beside their behavior in `src/game/`.

Browser and Node compiler projects are separate, share the required strict flags, and use explicit type imports. Authored TypeScript files stay below 200 lines. Development fixtures and test helpers are excluded from the standalone HTML.

## Verification and acceptance evidence

The compatibility run uses **Node 26.12.1**, **npm 11.20.0**, **Playwright 1.64.1** and **Chromium 156.0.8078.4**. These are the specification's named versions. The dependency lock preserves every required package pin. Results for other runtime/browser versions have not been recorded.

Recorded on 4 November 2026:

| Command | Result |
| --- | --- |
| `npm ci` | Locked install passed; every required package pin installed |
| `npm run typecheck` | Browser and Node projects passed |
| `npm test` | 109 tests passed across 7 files |
| `npm run build` | Type checking passed; one self-contained HTML emitted |
| `npm run test:e2e` | Fresh build and 28 browser tests passed; exit 0 |
| `npm run --silent replay -- examples/first-pair.replay.json` | Expected snapshot JSON; exit 0 |

- [Keyboard accessibility-tree evidence](evidence/keyboard-accessibility.txt): native Grid size and New Game discovery, closed positions, revealed face names, a matched pair, a complete 4x4 keyboard win, Tab exit and starting another game. Produced with Playwright's `ariaSnapshot()` in the Chromium version above.
- [Browser results](evidence/browser-results.json): machine-readable results of the browser journeys.
- [44px grayscale face sheet](evidence/faces-grayscale.html) and [PNG](evidence/faces-grayscale.png): all 128 SVG identities, visually reviewed for separate shape, marker and fill, including diagonal square markers.
- 16x16 layout evidence: [360x800](evidence/board-16-360.png), [1280x800](evidence/board-16-1280.png), and [640x400 at device scale 2](evidence/board-16-640.png).
- 4x4 completion evidence: [360x800](evidence/board-4-win-360.png), [1280x800](evidence/board-4-win-1280.png), and [640x400 at device scale 2](evidence/board-4-win-640.png).

No screen reader was used. Spoken output and real-device long-press context menus remain user acceptance checks as the specification describes. Headless Chromium keeps tabs visible, so automated visibility tests drive `document.hidden` and the native `visibilitychange` boundary with controlled time. Large-board checks use keyboard navigation, touch gestures, taps, measured card sizes and complete focus-outline bounds.
