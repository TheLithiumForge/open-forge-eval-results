# Neon Pairs
An offline memory game implementing [product specification 2.2](docs/README.md).

Open **[dist/index.html](dist/index.html)** directly in a browser. It contains all scripts, styles and SVG artwork, needs no server or network, and stays silent. Choose any board from 4x4 to 16x16. Use click, tap, Enter or Space to reveal cards; use arrow keys to move within the board.

“Reproduce a game” contains board-code loading and snapshot export/import. Copy exported JSON to save progress. Unfinished imports wait for Resume. New Game creates another deal; Restart repeats the current board code. Supported sizes and best move counts are saved when browser storage is available. Serve locally to check persistent storage; `file:` storage varies by browser.

## Commands

Use Node.js 24.19 or later and npm. Dependencies are pinned and `package-lock.json` is included.

```sh
npm ci
npm run dev
npm run typecheck
npm test
npx playwright install chromium
npm run test:e2e
npm run build
npm run --silent replay -- PATH
```

`dev` starts Vite. `typecheck` checks separate browser and Node compiler projects. `test` runs colocated unit tests. `test:e2e` first builds current source and then tests the built HTML in fresh Chromium contexts; a failed build stops the command. Its local preview server is stopped automatically. `build` type checks and emits the single offline HTML file.

Replay accepts the [version 1 replay format](docs/reproducibility.md#replay). For example, save this as `replay.json`:

```json
{"version":1,"boardCode":"np1-4-1","actions":[{"atMs":0,"index":0},{"atMs":0,"index":11}],"endMs":800}
```

Then run `npm run --silent replay -- replay.json`. Valid input prints only the final snapshot JSON to stdout and exits 0. This example produces one matched pair, one move and 800 elapsed milliseconds. Invalid input prints only an error to stderr and exits nonzero.

## Code structure

The implementation follows [Architecture](docs/architecture.md):

- `src/game/deal.ts`, `transitions.ts`, `snapshot.ts` and `replay.ts` contain pure generation, rules, logical time and format validation. Board descriptions and decks are immutable. Unit tests sit beside each behavior.
- `src/game/session/` owns React session state, monotonic browser timing, visibility, import pauses, announcements and validated storage access. Progress stays in memory until explicitly exported.
- `src/game/board/` owns card SVGs, accessible names, roving focus and board scrolling. Hidden cards mount only a common back.
- `src/game/controls/` owns native deal and reproduction controls. `Game.tsx` composes them with status and completion feedback.
- `scripts/replay.ts` is the Node CLI adapter. `tests/` contains full browser journeys. Test fixtures and evidence helpers are excluded from the distribution.

All 30 authored TypeScript/TSX files are below the 200-line limit. There is no global store, router, component library, external asset or runtime service.

## Verification

Tested on 4 November 2026 with the documented compatibility combination:

| Tool | Version |
| --- | --- |
| Node.js | 26.12.1 |
| npm | 11.20.0 |
| Playwright | 1.64.1 |
| Chromium | 156.0.8078.4 |
| TypeScript | 7.0.2 |
| React / React DOM | 19.3.1 |
| Vite | 8.3.5 |
| Vitest | 5.0.5 |

| Command | Result |
| --- | --- |
| `npm ci` | Passed locked installation |
| `npm run typecheck` | Passed both compiler projects |
| `npm test` | 84 tests passed in 6 files |
| `npm run test:e2e` | Fresh build and 23 browser journeys passed |
| `npm run build` | Passed; only `dist/index.html`, 237442 bytes |
| `npm run --silent replay -- PATH` | Published example passed; invalid input exited 1 with stderr only |

Unit coverage includes independent literal shuffle vectors and rejection sampling, every supported size, turn timing, caps, strict snapshot/replay validation and limits, CLI output, face names and storage failures. Browser coverage includes complete games at every size, pointer/touch/keyboard input, hidden DOM, focus, drafts, best scores, imported completion, paused imports, identical announcements, visibility timing and stale timer protection.

Layout checks cover 360x800, 1280x800 and the 640x400/device-scale-2 zoom equivalent, with native touch panning and complete keyboard focus outlines. Disk testing completed and restarted a game with network blocked, zero resource requests and no browser errors. Reduced motion and the single 600ms completion pulse were checked.

Generated evidence:

- Accessibility trees: [closed board](evidence/accessibility-initial.txt), [first reveal](evidence/accessibility-revealed.txt), [completed keyboard game](evidence/accessibility-completed.txt).
- [All 128 faces at 44px in grayscale](evidence/faces-grayscale.png), visually reviewed for shape, marker and fill distinctions.
- [Offline completion screenshot](evidence/offline.png) and [browser version](evidence/browser-version.txt).

No screen reader was used. The automated keyboard journey records Playwright accessibility-tree evidence; spoken output remains user acceptance under I17. Real-device long-press context-menu confirmation also remains user acceptance as specified in `docs/README.md`.
