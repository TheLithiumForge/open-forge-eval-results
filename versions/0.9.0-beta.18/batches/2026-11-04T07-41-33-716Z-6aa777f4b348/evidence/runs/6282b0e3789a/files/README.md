# Neon Pairs

A silent, offline memory game built from the [version 2.2 specification](docs/README.md).
Find every pair on square boards from 4x4 through 16x16. A face's shape, marker position
and fill identify it without relying on color.

## Play the distribution

Open [dist/index.html](dist/index.html) directly in a browser. This is the complete
240,953-byte distribution: JavaScript, CSS and SVG artwork are embedded in one HTML file.
Play needs no server, network, account or external assets.

Click or tap a card, or enter the board with Tab and use arrow keys, Enter and Space.
Tab leaves the board. Matches stay revealed; misses close after 800 active milliseconds.
The clock and mismatch interval pause while the page is hidden.

New Game deals fresh cards. Restart repeats the current deal. Grid size selects any
supported board. The last size and each size's best move count are saved when storage
is available; active progress stays in memory. Use a local HTTP origin when checking
saved preferences because browsers handle storage on file URLs differently.

## Board codes and snapshots

Open **Reproduce a game** to use the reproduction controls.

- Load a Board code such as `np1-4-1` to reproduce a starting deal. Codes use
  `np1-N-seed`, with a supported side length and a seed from 1 through 2147483646.
- Export snapshot fills Snapshot JSON with readable version 1 progress for manual copying.
- Load snapshot validates the complete JSON before replacing play. Unfinished imports
  wait for Resume; completed imports remain static and do not change best scores.

The exact algorithms, validation constraints and formats are in
[Reproducibility](docs/reproducibility.md).

## Development and commands

Use Node.js 24.19 or later and npm. All package versions are pinned in package.json and
package-lock.json. Install Chromium for the browser suite once after dependency installation.

```sh
npm ci
npx playwright install chromium
npm run dev
npm run typecheck
npm test
npm run build
npm run test:e2e
npm run --silent replay -- replay.json
```

`dev` serves the game locally. `typecheck` checks separate application, Node and browser-test
compiler projects. `test` runs focused unit tests. `build` type checks and emits the one-file
distribution. `test:e2e` first builds current source, then runs browser journeys in fresh contexts
against that build; a failed build stops the command. Its temporary HTTP server stops afterward.

Replay is a developer command, with no replay controls in the game UI. Save this as `replay.json`:

```json
{"version":1,"boardCode":"np1-4-1","actions":[{"atMs":0,"index":0},{"atMs":0,"index":11}],"endMs":800}
```

The replay command prints only the final snapshot JSON and exits 0. This example finishes
with one pair, one move and 800 elapsed milliseconds. Invalid or unreadable input produces
an error on stderr, empty stdout and a nonzero exit.

## Architecture

- `src/game` contains pure deterministic deals, card transitions, logical time, snapshots and replay.
- `src/game/session` contains React session state, monotonic browser timing, visibility and preferences.
- `src/game/board` contains cards, SVG faces and remembered keyboard focus.
- `src/game/controls` contains native deal and reproduction controls; `Game.tsx` composes the interface.
- Focused unit tests sit beside their behavior. Application journeys and test-only fixtures live
  in `e2e`; they are excluded from the distribution. Authored TypeScript files stay below 200 lines.

## Verified delivery

The named compatibility combination was tested on 4 November 2026:
**Node 26.12.1, npm 11.20.0, Playwright 1.64.1 and Chromium 156.0.8078.4**.
Installed versions also include React 19.3.1, TypeScript 7.0.2, Vite 8.3.5 and Vitest 5.0.5,
with every dependency matching the pins in [Technology](docs/technology.md).

| Command | Recorded result |
| --- | --- |
| `npm ci` | Locked install passed |
| `npm run typecheck` | All three strict compiler projects passed |
| `npm test` | 121 tests passed across 11 files |
| `npm run build` | Passed; emitted only `dist/index.html` |
| `npm run test:e2e` | Fresh build followed by 38 passing journeys, 2.3 minutes |
| `npm run --silent replay -- PATH` | Valid, malformed and missing-file cases checked by subprocess tests |

The browser suite completes all seven sizes and checks exact active mismatch timing,
visibility pauses, stale callbacks, keyboard and touch input, repeated announcements,
snapshot import/export, score persistence and storage failures. It checks board geometry
and complete focus outlines at 360x800, 1280x800 and 640x400 with device scale 2,
reduced motion and the single completion pulse. It also opens the built HTML from disk
in an offline browser context, finishes a game and confirms zero HTTP requests.

[Keyboard accessibility-tree evidence](evidence/keyboard-accessibility.txt) records closed
positions, a revealed face, the first match, the final match with its win and a subsequent
new game. It records the actual Chromium version. No screen reader was used; spoken
output confirmation and physical-device long-press behavior remain user acceptance.

[44px grayscale face sheet](evidence/faces-grayscale-44.png) shows all 128 rendered SVG
identities in face-ID order. Shape, marker and fill remain distinct, including diagonal
markers on solid and outline squares. The test also checks the specified SVG geometry.
