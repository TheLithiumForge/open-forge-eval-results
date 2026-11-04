# Neon Pairs
Neon Pairs is a browser memory game that asks you to find every matching pair.

Open **[dist/index.html](dist/index.html)** directly in your browser to play offline. The HTML contains all scripts, styles and SVG artwork. It needs no server or network connection.

Choose a grid from 4x4 through 16x16. Reveal cards with a click, tap, Enter or Space. Arrow keys move between cards; Tab leaves the board. Matches stay open, and misses close after 800 active milliseconds. The game is silent.

Read the [product specification](docs/README.md) for the complete rules.

## Development

Use Node.js 24.19 or later and npm. Dependencies are pinned in `package.json` and `package-lock.json`.

```sh
npm ci
npx playwright install chromium
npm run dev
```

| Command | Result |
| --- | --- |
| `npm run typecheck` | Check browser and Node compiler projects separately |
| `npm test` | Run focused unit tests beside the game behaviors |
| `npm run build` | Type check and build the standalone `dist/index.html` |
| `npm run test:e2e` | Build current source, then test that build in fresh Chromium contexts |
| `npm run --silent replay -- PATH` | Print a replay's final snapshot; reject invalid input on stderr with a nonzero exit |

The browser test command uses `&&` to require a successful build before testing. Its temporary HTTP server is stopped when the suite exits. No development fixtures are included in the distribution.

## Reproducing a game

Expand **Reproduce a game**. Load a board code such as `np1-4-1` to repeat its starting deal. Restart repeats the current deal; New Game changes its seed.

**Export snapshot** fills the text area with progress you can copy into a file. **Load snapshot** restores valid JSON. An unfinished import waits for **Resume**; a completed import shows a static win without changing your best score. Reload starts a fresh deal. Only the chosen size and best moves persist automatically. Use a local HTTP origin when checking persistence; browser storage behavior varies for files opened from disk.

The included [example replay](examples/pair.replay.json) matches one pair in one move:

```sh
npm run --silent replay -- examples/pair.replay.json
```

Board codes, snapshot validation and replay timing follow the [version 1 formats](docs/reproducibility.md).

## Code organization

The implementation follows [Architecture](docs/architecture.md):

- `src/game`: pure deck generation, immutable board descriptions, state transitions, logical time, validation, snapshots and replay.
- `src/game/session`: React session state, monotonic browser timing, visibility, preferences and best scores.
- `src/game/board`: native card buttons, inline face SVGs and remembered keyboard navigation.
- `src/game/controls`: native deal and reproduction controls with adjacent styles.
- `src/Game.tsx`: composes the game; focused unit tests stay beside their behavior, and browser journeys live in `tests`.
- `scripts/replay.ts`: the Node CLI, using the same pure rules as the browser.

Authored TypeScript files stay below 200 lines. Browser and Node projects enable strictness, unchecked-index checks, exact optional properties, verbatim modules and erasable syntax.

## Validation

Compatibility combination: **Node 26.12.1, npm 11.20.0, Playwright 1.64.1, Chromium 156.0.8078.4**. All package versions match the specification.

Verified on 4 November 2026 with that exact combination:

| Check | Result |
| --- | --- |
| `npm ci` | Passed; locked dependencies installed |
| `npm run typecheck` | Passed for browser and Node projects |
| `npm test` | 114 tests passed across 6 files, Vitest 5.0.5 |
| `npm run build` | Passed; emits only `dist/index.html` (approximately 239 kB) |
| `npm run test:e2e` | Fresh build passed, then all 27 browser journeys passed |
| `npm run dev` | Started successfully and served the game HTML; stopped after checking |
| `npm run --silent replay -- examples/pair.replay.json` | Snapshot output contains one matched pair, one move and 800ms elapsed |

The grayscale face sheet was also visually reviewed, including solid and outlined squares with diagonal markers. All authored TypeScript files are below 100 lines.

The browser journeys include every board size, keyboard and pointer input, touch taps, paused imports, timing and visibility, stale timer resets, saved best scores, invalid input, replay CLI output, reduced motion, and direct file playback with networking disabled. Layouts are measured at 360x800, 1280x800 and 640x400 with device scale 2 for the zoom equivalent.

Review artifacts:

- [Keyboard accessibility-tree journey](evidence/keyboard-accessibility.txt), including browser/tool versions, closed and revealed names, turn announcements and completion.
- [All 128 grayscale faces at 44px](evidence/grayscale-faces.html) and [its screenshot](evidence/grayscale-faces.png).
- [Desktop game](evidence/game-desktop.png) and [phone 16x16 board](evidence/game-mobile-16.png).

No screen reader was used. Spoken output and a real-device touch long press remain user acceptance checks, as the specification defines. Automated checks cover the accessibility tree, announcement events, right-click behavior and touch taps.
