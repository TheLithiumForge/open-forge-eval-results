# Neon Pairs

Neon Pairs is an offline memory game. Choose a board size and find every matching pair. Use a board code to repeat a deal, export a snapshot to save progress, or replay timed actions with the command line tool.

The product requirements and acceptance journeys are in [docs/README.md](docs/README.md) and its linked specifications.

## Play

Open [`dist/index.html`](dist/index.html) directly in a browser. The distribution is a single HTML file with its JavaScript, styles and SVG artwork inline; it needs no server or network access to play. Grid sizes run from 4×4 through 16×16. Mouse, touch and keyboard all activate cards. A mismatch closes after 800 active milliseconds. The game can be restarted or given another deal, and progress can be exported or imported as a snapshot.

For local development, run `npm run dev` and open the URL printed by Vite. Saved preferences and best scores are tested from the served origin because browser storage on a `file:` URL differs.

## Build and checks

The lockfile pins the project toolchain. Run these commands from the project root:

```sh
npm ci
npx playwright install chromium
npm run dev
npm run typecheck
npm test
npm run test:e2e
npm run build
npm run --silent replay -- PATH
```

On a fresh machine, install Playwright's Chromium binary once with `npx playwright install chromium`. `npm run test:e2e` builds from current source before launching Playwright and fails if the build fails. `npm run build` checks all TypeScript projects and emits `dist/index.html`.

### Recorded verification

The following build, test and replay checks were run with Node.js `26.12.1`, npm `11.20.0`, Playwright `1.64.1` and Chromium `156.0.8078.4`:

| Command | Result |
| --- | --- |
| `npm ci` | Installed the locked dependencies; 0 vulnerabilities reported |
| `npm run typecheck` | Passed |
| `npm test` | 8 test files and 24 tests passed |
| `npm run test:e2e` | Fresh build succeeded; all 26 browser tests passed |
| `npm run build` | Passed; emitted one `dist/index.html` (242.28 kB) |
| Valid replay sample | Exit 0; printed a version 1 snapshot to stdout |
| Invalid replay sample | Exit 1; printed `Invalid replay.` to stderr |

The browser checks include all seven board sizes, snapshot pause/resume and import, best-score persistence, mismatch timing, keyboard and pointer input, focus visibility, responsive 16×16 boards, reduced motion, and a disk-opened distribution with networking disabled. The offline browser run made no HTTP requests and completed a pair.

The recorded compatibility combination does not imply results for other versions; test those separately.

## Replay command

Replay files use the version 1 format in [docs/reproducibility.md](docs/reproducibility.md#replay). Run:

```sh
npm run --silent replay -- PATH
```

For a valid file, the command prints the resulting snapshot JSON to stdout. An invalid or unreadable file returns a nonzero exit code and reports the failure on stderr. For example, the documented replay sample in the specification resolves to one matched pair, one move and 800 elapsed milliseconds.

## Project structure

- `src/game/` contains pure deal generation, state transitions, snapshot validation and replay logic.
- `src/game/session/` contains React session, clock, visibility and saved-preference behavior.
- `src/game/board/` contains the board, roving keyboard focus, cards, face SVGs and colocated styles.
- `src/game/controls/` contains game and reproducibility controls with colocated styles.
- `src/cli/replay.ts` implements the Node replay command.
- `e2e/` contains browser journeys; focused unit tests are beside the behavior they cover.
- `evidence/` contains browser-tree, layout and face artwork evidence.
- `dist/index.html` is the offline deliverable.

All authored TypeScript files are kept at or below the specification's 200-line limit. The shipped game contains no debug fixture, solver endpoint, remote asset or API dependency.

## Acceptance evidence and limits

- [`evidence/keyboard-journey.txt`](evidence/keyboard-journey.txt) records the browser accessibility tree through a complete keyboard game, including card names, match and win announcements, leaving the board with Tab, and starting a new game from the keyboard.
- [`evidence/faces-grayscale-44px.png`](evidence/faces-grayscale-44px.png) shows all 128 actual face SVGs at a 44px card size in grayscale. [`evidence/matched-top-right-marker-44px.png`](evidence/matched-top-right-marker-44px.png) and its 4× detail [`evidence/matched-top-right-marker-zoom.png`](evidence/matched-top-right-marker-zoom.png) show the matched upper-right marker and check at actual card size and enlarged scale.
- [`evidence/neon-pairs-mobile.png`](evidence/neon-pairs-mobile.png), [`evidence/neon-pairs-desktop.png`](evidence/neon-pairs-desktop.png) and [`evidence/neon-pairs-zoom-equivalent.png`](evidence/neon-pairs-zoom-equivalent.png) record the mobile, desktop and zoom-equivalent layouts.

No screen reader was used; spoken output remains part of user acceptance. A real-device touch long press also remains user acceptance, as specified in [docs/README.md](docs/README.md#out-of-scope).
