# Neon Pairs

Neon Pairs is a browser memory game. The complete specification is in [docs/README.md](docs/README.md), with requirements for rules, controls, keyboard input, reproducibility, visuals, sound, architecture and delivery.

## Run

```sh
npm ci
npm run dev
```

For an offline single-file build, run `npm run build` and open [`dist/index.html`](dist/index.html) directly from disk. The file includes its JavaScript, CSS and inline SVG artwork. Saved preferences use browser storage on a local HTTP origin.

The replay developer command reads a version 1 replay file and prints the final snapshot JSON:

```sh
npm run --silent replay -- PATH
```

## Project layout

- `src/game/` contains deterministic deal generation, game transitions, snapshots and replay validation.
- `src/game/session/` contains browser timing, visibility handling and saved preferences and scores.
- `src/game/board/` contains the keyboard board and card controls.
- `src/game/controls/` contains deal and reproduction controls.
- `src/game/*.test.ts` contains pure game tests; `e2e/` contains browser journeys.

## Verification

The named compatibility combination was tested on 4 November 2026:

- Node.js `26.12.1`; npm `11.20.0`
- Playwright `1.64.1`; Chromium `156.0.8078.4`
- Locked install: `npm ci` passed.
- Type check: `npm run typecheck` passed for both browser and Node compiler projects.
- Unit tests: `npm test` passed (13 tests).
- Browser journeys: `npm run test:e2e` passed (5 tests). They cover keyboard completion, snapshots and pause timing, saved scores and preferences, network-blocked `file:` loading, and 16x16 narrow layouts.
- Distribution build: `npm run build` passed and emitted `dist/index.html` (239.80 kB).

The browser accessibility tree captured during play and after the final match is in [artifacts/accessibility-tree.txt](artifacts/accessibility-tree.txt). No screen reader was used; spoken output remains part of user acceptance as described in [Input](docs/input.md#screen-reader).
