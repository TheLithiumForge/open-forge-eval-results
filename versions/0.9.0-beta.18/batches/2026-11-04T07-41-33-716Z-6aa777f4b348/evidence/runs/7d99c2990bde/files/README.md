# Neon Pairs

Find every matching pair with mouse, touch, or keyboard. Open
[`dist/index.html`](dist/index.html) directly from disk to play offline. The HTML
contains all JavaScript, CSS, and SVG artwork; play makes no network requests and
stays silent. Serve it over local HTTP to check saved sizes and best scores.

Choose Grid size, New Game, or Restart. Tab enters the remembered card; arrow keys
move without wrapping, and Enter or Space reveals it. Tab leaves the board.
Reproduce a game contains board codes and snapshot import/export. Unfinished
imports wait for Resume. A page reload starts a fresh deal at the saved size.

The [specification](docs/README.md) defines the product and version 1 formats.

| Command | Purpose |
| --- | --- |
| `npm ci` | Install exact locked dependencies |
| `npm run dev` | Start local development at the URL Vite prints |
| `npm run typecheck` | Check browser, Node tooling, and browser-test projects |
| `npm test` | Run colocated game, session, artwork, navigation, and CLI unit tests |
| `npm run build` | Type check and emit only `dist/index.html` |
| `npm run test:e2e` | Build current source, then run Playwright against that build |
| `npm run --silent replay -- examples/one-pair.replay.json` | Print a replay's final snapshot |

For a new test environment, install Chromium with `npx playwright install chromium`.
The browser command starts and stops its own local preview server. A failed build
stops the command before browser tests run. Tests use fresh contexts and include
disk play with network access disabled, plus local HTTP for persistence.

[`examples/one-pair.replay.json`](examples/one-pair.replay.json) uses `np1-4-1`,
reveals positions 0 and 11 at time zero, and ends at 800ms. Its output has one
matched pair, one move, and 800 elapsed milliseconds. Invalid input exits nonzero,
writes an error to stderr, and leaves stdout empty. Replay has no UI controls.

`src/game` contains the pure board-code, deck, transition, logical-time, snapshot,
and replay functions. `src/game/session` owns React state, browser time, visibility,
preferences, status, and announcements. `src/game/board` owns card artwork and
navigation; `src/game/controls` owns native deal and reproduction controls.
`src/Game.tsx` composes them. Focused tests and styles sit beside their behavior;
complete browser journeys live in `tests/e2e`. Every authored TypeScript file is
at most 200 lines. The distribution includes no test fixtures or diagnostic API.

Verification on 4 November 2026 uses Node **26.12.1**, npm **11.20.0**,
Playwright **1.64.1**, and Chromium **156.0.8078.4**, with the exact package pins
and lockfile in this repository. `npm ci`, `npm run typecheck`, `npm test`
(121 unit/CLI tests), `npm run build`, and the complete `npm run test:e2e`
(29 browser journeys) passed. Browser journeys cover all seven board sizes,
timing/visibility, session replacement, persistence, native input/focus,
announcements, imports/caps, phone/desktop/zoom layouts, motion, all faces, and
offline play. A final status-label typography correction passed another fresh
build/typecheck and 10 relevant browser journeys, refreshing the evidence below.

[`evidence/accessibility-tree.txt`](evidence/accessibility-tree.txt) records the
automated complete 4x4 keyboard journey using Playwright ARIA snapshots and
Chromium's accessibility tree. It includes native controls by name, closed and
revealed card names, matched disabled states, turn results, the final combined
match/win announcement, and leaving the board to start another game. No screen
reader was used. Spoken output and a real-device touch long press remain user
acceptance checks, as the specification requires.

[`evidence/faces-grayscale.png`](evidence/faces-grayscale.png) shows faces 0–127 in
order at 44px. It is generated from the built DOM through a completed public
snapshot, with grayscale applied only in the test fixture. Shape, marker position,
and solid/outline fill distinguish all identities, including diagonal-marker
squares. Automated checks also measure marker radius, stroke, and 40-unit offset.
