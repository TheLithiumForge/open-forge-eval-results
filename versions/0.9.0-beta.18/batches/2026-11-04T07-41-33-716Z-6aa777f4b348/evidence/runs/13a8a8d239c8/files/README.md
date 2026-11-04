# Neon Pairs

Neon Pairs is an offline memory game built with React, TypeScript, native browser controls and inline SVG. Pick a board size, find each matching pair, and use board codes, snapshots or replay files to reproduce a game.

## Build and run

Use Node.js 26.12.1 and npm 11.20.0. Install the locked dependencies and run the checks:

```sh
npm ci
npm run typecheck
npm test
npm run test:e2e
npm run build
```

For local development, start the server in its own terminal:

```sh
npm run dev
```

`npm run test:e2e` builds first, then runs browser journeys against the built HTML. `npm run build` checks the compiler projects and writes `dist/index.html`. That single file opens directly from disk and contains the game script, styles and artwork. The game makes no network requests. Browser preferences and best moves are checked through a local HTTP origin because browser storage behavior differs for `file:` URLs.

## Play and reproduce

Choose a grid size from 4x4 to 16x16. A valid code such as `np1-4-1` reproduces a starting deal. In **Reproduce a game**, export progress to readable snapshot JSON, then paste a snapshot to restore it. An unfinished imported snapshot remains paused until Resume. Game progress stays in memory unless you export it; saved grid size and best moves stay in local storage.

Replay files are for the developer CLI, not the game UI. Run the included example with:

```sh
npm run --silent replay -- examples/matching-pair.replay.json
```

The command prints one version 1 snapshot JSON object to standard output and exits successfully. Invalid replays print nothing to standard output, report an error to standard error and exit nonzero. Board codes, snapshots and replays are defined in [Reproducibility](docs/reproducibility.md).

## Project structure

- `src/game/board.ts`, `state.ts`, `snapshot.ts` and `replay.ts` contain deterministic, browser-free game rules and formats.
- `src/game/session/` owns active time, visibility, saved preferences and best scores.
- `src/game/board/` contains board focus/navigation, card states and the 128 SVG faces.
- `src/game/controls/` contains deal and reproduction controls.
- `e2e/` contains browser acceptance journeys. `e2e/server.ts` serves only the freshly built HTML during storage tests.
- `evidence/` contains the generated keyboard accessibility tree and reviewed face artwork.

## Verified compatibility and evidence

On 4 November 2026, the named combination was verified with Node.js **26.12.1**, npm **11.20.0**, Playwright **1.64.1** and Chromium **156.0.8078.4**. The locked install, type check, all 28 unit tests, all 27 browser journeys, the build and both valid/invalid replay CLI behavior passed with this combination.

The browser suite checks deals at all seven sizes, timing, storage, snapshots, keyboard and pointer controls, announcements, reduced motion, responsive layouts, file-based offline play, and replay output. It produced an automated Chromium accessibility-tree record of the complete 4x4 keyboard journey and a 44px grayscale sheet of all 128 faces. The grayscale sheet and the matched card with its bottom-right marker are visually reviewed.

The browser and tool tree were used for automated accessibility evidence. No screen reader was used, so spoken output still needs user confirmation. A real-device long press was not tested because the specification leaves that gesture in user acceptance.

Evidence files:

- [Completed keyboard accessibility tree](evidence/accessibility-finished.yaml)
- [Revealed card accessibility tree](evidence/accessibility-revealed.yaml)
- [All 128 faces at 44px in grayscale](evidence/faces-grayscale-44.png)
- [Matched diagonal square at 44px](evidence/matched-bottom-right-square-44.png)
