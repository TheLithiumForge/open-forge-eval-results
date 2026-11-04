# Neon Pairs

Neon Pairs is an offline browser memory game. Read the [game specification](docs/README.md) for its behavior, appearance and accessibility requirements.

## Install and run

Use Node.js 26.12.1 and npm 11.20.0. Install the locked packages, then run the development server with:

```sh
npm ci
npm run dev
```

The required versions are pinned exactly in `package.json` and `package-lock.json`: React and React DOM 19.3.1, TypeScript 7.0.2, Vite 8.3.5, `@vitejs/plugin-react` 6.1.2, `vite-plugin-singlefile` 2.3.4, Vitest 5.0.5, Playwright 1.64.1, React type definitions 19.3.0, and Node type definitions 24.19.2.

## Commands

```sh
npm run typecheck
npm test
npm run test:e2e
npm run build
npm run --silent replay -- PATH
```

The build checks both the browser and Node compiler projects before emitting `dist/index.html`. That file includes its JavaScript and CSS and can be opened directly from disk. `test:e2e` always builds first, then runs the Playwright journeys against the fresh output. For saved-preference checks, serve the game over local HTTP because browser storage may differ on a `file:` URL.

The replay command accepts a version 1 replay JSON file. A valid replay prints only its final snapshot JSON to stdout and exits successfully. An invalid file prints an error to stderr and exits nonzero.

Try the included [first-match replay](examples/first-match.replay.json):

```sh
npm run --silent replay -- examples/first-match.replay.json
```

## Core API

Pure game behavior lives under `src/game`; it does not read browser storage, clocks, DOM state or random sources.

- `parseBoardCode` and `createGame` validate a board code and create its deterministic deal. The parser is strict; callers trim user-entered board-code drafts before parsing.
- `activateCard`, `advanceGame` and `isWon` apply turns and logical active time to immutable game state.
- `encodeSnapshot` and `decodeSnapshot` serialize progress and validate imported data. Unfinished-import pause state belongs to the browser session.
- `replayGame` validates and runs timed actions through the same transition functions.

Board generation uses the version 1 Park–Miller algorithm. Snapshot and replay validators reject unknown object keys, invalid state and data beyond their byte and action limits. The board, its deck, and returned state records are read-only and frozen; transitions return a new state when an action changes the game.

## Browser implementation

`src/Game.tsx` composes the status panel, deal controls, reproduction tools and board. The session hook owns active time, visibility changes, imported-snapshot pause state, saved scores and deal replacement. The board module owns arrow-key navigation, focus scrolling, accessible card names and inline SVG faces. Browser preferences use the dedicated JSON keys `neon-pairs.grid-size.v1` and `neon-pairs.best-moves.v1`; other local storage keys are left untouched.

Cards mount face artwork only while revealed or matched. Hidden cards have a shared diamond back. The app has one polite live region for turn results and reproduction statuses.

## Compatibility evidence

The locked install and checks passed with Node.js 26.12.1, npm 11.20.0, Playwright 1.64.1 and Chromium 156.0.8078.4. `npm ci` installed 50 packages with no reported vulnerabilities. `npm run typecheck` passed the browser, Node and browser-test TypeScript projects; `npm test` passed 16 unit tests across four files; `npm run test:e2e` passed 26 browser journeys; and `npm run build` emitted the self-contained `dist/index.html` (242.96 kB, 76.53 kB gzip).

The browser suite opens the built file with network requests blocked and verifies there are no external asset or audio requests. It also checks saved preferences using the managed local HTTP preview server. Journeys cover all seven board sizes, board and snapshot validation, replay CLI success and errors, mismatch timing and visibility pause, imported remainders, storage failures, keyboard and touch input, accessibility names and announcements, responsive scrolling, reduced motion, and completion behavior.

Persistent automated accessibility-tree evidence from a complete keyboard game is in [evidence/keyboard-accessibility.md](evidence/keyboard-accessibility.md). The [grayscale face sheet](evidence/faces-grayscale.png) shows all 128 real SVG faces once at 44px with fixture-only labels; it is generated in the browser test and is not part of the shipped app. I reviewed the sheet: solid and outline forms and all marker directions remain distinguishable in grayscale, including square markers. No screen reader was used; spoken output and real-device touch long-press remain user acceptance checks.
