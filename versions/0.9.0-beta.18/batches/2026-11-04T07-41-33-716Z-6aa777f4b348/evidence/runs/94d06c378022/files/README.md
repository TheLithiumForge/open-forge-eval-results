# Neon Pairs

Neon Pairs is an offline memory game. Turn over two cards at a time, remember mismatches, and finish each board in as few moves as possible. Its shape, marker and fill let you tell card faces apart without color.

## Play and reproduce

Choose a grid size and select **New Game**. Use a pointer, touch, or the arrow keys to move through the board; Enter and Space reveal a card. Matches stay open. A mismatch closes after 800 active milliseconds. **Restart** repeats the current deal.

Open **Reproduce a game** to load a board code, export or import a snapshot, or resume an unfinished import. A board code such as `np1-4-1` repeats the same starting deal. A snapshot preserves progress. Replay files are handled by the developer command only:

```sh
npm run --silent replay -- PATH
```

The command prints the final version 1 snapshot on valid input. Invalid replay files produce an error on stderr and exit with a nonzero status.

## Run and build

Use Node.js 26.12.1 and npm 11.20.0 for the recorded compatibility result below.

```sh
npm ci
npm run dev
```

The development server opens the game locally. To check or rebuild the offline distribution, run:

```sh
npm run typecheck
npm test
npm run test:e2e
npm run build
```

`npm run test:e2e` builds the current source before it starts the browser journeys; a failed build stops the command. `npm run build` type-checks all compiler projects and emits the standalone HTML file.

## Offline distribution

Open [dist/index.html](dist/index.html) directly in a browser. It includes the React application, CSS and inline SVG artwork, and does not need a server or network access to play. Saved size and best scores are checked using the local HTTP test origin because browsers handle storage for `file:` pages differently.

## Project structure

- `src/game/` contains pure board generation, transitions, snapshot validation and replay behavior.
- `src/game/session/` contains browser timing, visibility changes, saved preferences, best scores and import pauses.
- `src/game/board/` contains keyboard navigation, focus handling, card states and face artwork.
- `src/game/controls/` contains the native deal and reproduction controls.
- `tests/` contains browser journeys against the built file and unit-style application checks. Tests derive card positions from documented board codes; the game exposes no deck-solving endpoint.

The full requirements are in [docs/README.md](docs/README.md), [docs/architecture.md](docs/architecture.md), [docs/rules.md](docs/rules.md), [docs/controls.md](docs/controls.md), [docs/input.md](docs/input.md), [docs/reproducibility.md](docs/reproducibility.md), [docs/visuals.md](docs/visuals.md) and [docs/sound.md](docs/sound.md).

## Browser evidence

- [Four by four keyboard journey accessibility tree](evidence/accessibility-tree.txt), captured from Chromium. It includes closed-card, revealed-card and completed-game nodes.
- [Four by four completed keyboard journey](evidence/keyboard-4x4-win.png).
- [128 face grayscale sheet at 44 pixels](evidence/faces-128-grayscale.png).

The evidence records browser versions in the verification section below. No screen reader was used. The automated accessibility tree documents names and states; spoken output remains for user acceptance with a screen reader.

## Verification record

Recorded on 4 November 2026 with the locked install:

- Node.js **26.12.1**, npm **11.20.0**
- React and React DOM **19.3.1**
- `@types/react` and `@types/react-dom` **19.3.0**
- TypeScript **7.0.2**
- Vite **8.3.5**, `@vitejs/plugin-react` **6.1.2**, `vite-plugin-singlefile` **2.3.4**
- Vitest **5.0.5**
- `@types/node` **24.19.2**
- Playwright **1.64.1**, Chromium **156.0.8078.4**

| Command | Result |
| --- | --- |
| `npm ci` | Passed; 51 packages installed, no vulnerabilities reported. |
| `npm run typecheck` | Passed across the app, Node, unit-test and browser-test projects. |
| `npm test` | Passed 26 tests in 8 files. |
| `npm run test:e2e` | Passed 24 browser journeys against a fresh build. |
| `npm run build` | Passed; emitted only `dist/index.html` (243,581 bytes). |
| `npm run --silent replay -- PATH` | Valid and invalid replay CLI cases passed. |
| `npm run dev` | Served the game successfully during a local smoke check. |

The HTTP server used by browser storage checks and the development server were stopped after verification. No screen reader was used. The automated browser journey saved an accessibility tree, but spoken output stays for user acceptance with a screen reader. Long-press context menu behavior on a physical touch device also stays in user acceptance as specified in [Input](docs/input.md).
