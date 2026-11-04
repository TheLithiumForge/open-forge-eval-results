# Neon Pairs

An offline, silent memory game built to [product specification 2.2](docs/README.md).
Open **[dist/index.html](dist/index.html)** directly in a browser. Everything needed to play is in that file; no server or network connection is required.

## Develop and verify

Use Node.js 24.19 or later and npm. Dependencies are pinned in `package.json` and `package-lock.json`.

```sh
npm ci
npm run dev
npm run typecheck
npm test
npm run test:e2e
npm run build
```

`dev` serves the source. Stop it with Ctrl+C. `build` type checks the browser, Node tooling and browser-test compiler projects, then replaces `dist` with a single HTML file. `test:e2e` first runs that build and only starts Playwright if it succeeds. Tests use fresh browser contexts against the built distribution, and the test HTTP server exits when the run finishes. If Chromium is not installed, run `npx playwright install chromium` before browser tests.

Use a local HTTP origin (`npm run dev`) to retain grid size and best scores reliably. Storage on `file:` URLs varies by browser. Blocked storage leaves the current session playable. Active progress is kept in memory; export a snapshot to preserve it.

## Board codes, snapshots and replay

Expand **Reproduce a game** to load a board code or copy a snapshot. For example, `np1-4-1` reproduces the documented deal. A loaded unfinished snapshot waits for **Resume**; a completed snapshot remains completed and does not replace a saved best score.

Replay is a developer command, with no replay controls in the shipped UI:

```sh
npm run --silent replay -- path/to/replay.json
```

For example, save this as `replay.json`:

```json
{"version":1,"boardCode":"np1-4-1","actions":[{"atMs":0,"index":0},{"atMs":0,"index":11}],"endMs":800}
```

The command writes only the final version 1 snapshot JSON to stdout and exits 0. Invalid input writes a message to stderr, nothing to stdout and exits nonzero. Board generation, JSON field validation, byte limits and replay ordering follow [Reproducibility](docs/reproducibility.md).

Ready-to-use inputs: [one-pair replay](examples/one-pair.replay.json) and [pending-mismatch snapshot](examples/mismatch.snapshot.json).

## Architecture

- `src/game/boardCode.ts`, `model.ts`, `transitions.ts`, `snapshot.ts` and `replay.ts`: pure deterministic rules and versioned formats, with focused tests beside each behavior.
- `src/game/session/`: browser clock and visibility lifecycle, imported pause, React session state, announcements and validated preference storage.
- `src/game/board/`: native card buttons, remembered focus, arrow navigation, scrolling, inline SVG faces and their styles.
- `src/game/controls/`: deal and reproduction controls, with props and styles beside the components.
- `src/Game.tsx`: composes controls, status and board. `tests/e2e/` holds complete browser journeys. `scripts/replay.ts` runs the pure replay core in Node.

The board description and deck are immutable. Hidden cards mount no face SVG and expose no face identity. There is no diagnostic API, global store, audio, external artwork, remote font or runtime service. Authored TypeScript files stay below the 200-line limit.

## Verification evidence

Verified on 4 November 2026, on Linux, with the named compatibility combination: **Node.js 26.12.1, npm 11.20.0, Playwright 1.64.1 and headless Chromium 156.0.8078.4**. Every dependency matches the specification's exact pin. Other runtime combinations have not been tested.

| Command | Result |
| --- | --- |
| `npm ci` | Locked install passed; 50 packages installed |
| `npm run typecheck` | Browser, Node and browser-test projects passed |
| `npm test` | 95 tests passed across 8 files |
| `npm run build` | Passed; only `dist/index.html`, 240772 bytes |
| `npm run test:e2e` | 26 journeys passed; one touch gesture in the test harness needed correction |
| `npm run test:e2e -- --last-failed` | Remaining touch journey passed against a fresh build |
| `npm run --silent replay -- examples/one-pair.replay.json` | Exit 0; only the expected snapshot on stdout |

All **27 browser journeys** passed across the full run and the targeted rerun. The touch test uses direct browser touch-start, move and end input after Chromium's synthetic scroll gesture did not scroll. No game code changed for that correction. Invalid replay input was also checked through npm: exit 1, empty stdout and an error on stderr.

Browser journeys include completing every size, exact mismatch timing, hidden-page pause, resetting during a miss, imported pauses, best-score persistence, blocked storage, keyboard input, repeated live announcements, emulated touch scrolling, mobile layouts, equivalent zoom and direct-from-disk offline play with networking blocked. The grayscale sheet was visually reviewed. All authored TypeScript files are below 200 lines. The browser test server was stopped after verification.

- [Keyboard accessibility-tree journey](evidence/keyboard-journey.txt): hidden, revealed, matched, completed and reset states, plus ordered announcements.
- [All 128 face identities at 44px in grayscale](evidence/faces-grayscale.png).
- [Phone layout](evidence/phone.png).

No screen reader was used. Spoken output and a real device's touch long-press context menu remain user acceptance checks as defined in [Input](docs/input.md). Automated evidence checks accessible names, focus, native Tab exit and one live announcement per turn, including consecutive identical results and the final match with its win.
