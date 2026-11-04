# Neon Pairs

Neon Pairs is a memory game you can play in a browser or open directly from the offline distribution. Choose a grid, reveal two cards at a time, and find each matching pair. A board code repeats the starting deal; a snapshot saves progress; and the replay command turns recorded actions into a snapshot.

The product contract is in [the specification map](docs/README.md). It links the rules, controls, input and accessibility requirements, visuals, reproducibility formats, technology and architecture documents.

## Play

Choose a size from 4x4 through 16x16. Use pointer, touch or keyboard: arrow keys move the board focus, Enter or Space reveals a card, and Tab leaves the board. Matches stay face up. A mismatch stays visible for 800 active milliseconds. The timer and mismatch pause when the page is hidden. A completed game shows its moves and time.

New Game creates a new deal. Restart repeats the current deal. Open **Reproduce a game** to enter a board code or to export and load a snapshot. Imported unfinished games wait for Resume.

## Run and build

Use Node.js 24.19 or later. The tested compatibility combination is Node.js `26.12.1`, npm `11.20.0`, Playwright `1.64.1`, and Chromium `156.0.8078.4`.

| Command | Result |
| --- | --- |
| `npm ci` | Install the pinned dependencies from the lockfile. |
| `npm run dev` | Serve the development game locally. |
| `npm run typecheck` | Check the browser and Node TypeScript projects. |
| `npm test` | Run the pure core, session and visual-behavior unit tests. |
| `npm run test:e2e` | Build the current source, then run the browser journeys in fresh contexts. |
| `npm run build` | Type check and write the offline `dist/index.html`. |
| `npm run --silent replay -- PATH` | Validate a replay JSON file and print its final snapshot. |

The replay command prints only the version 1 snapshot and exits `0` for valid input. Invalid input prints nothing to stdout, writes an error to stderr, and exits nonzero.

Open [dist/index.html](dist/index.html) directly to play offline. Its script, styles and SVG artwork are inline; the page makes no network request. Saved size and best moves use browser storage when it is available. For storage checks, run the browser tests against their local HTTP preview.

## Code map

- `src/game/board` contains board-code parsing and deterministic deck generation, focus navigation, card faces, and their focused tests.
- `src/game` contains pure card transitions, logical time, snapshot validation and replay.
- `src/game/session` contains React session state, visibility and timer lifecycle, browser storage and best scores.
- `src/game/Game.tsx` composes the board, game and reproduction controls. Each component has its own styles beside it.
- `src/cli/replay.ts` implements the replay command. `tests/e2e` holds complete browser journeys; test screenshots and accessibility output live in `evidence`.

The browser and Node compiler projects are configured separately. The core has no browser clock, DOM, storage or random-source dependency. The distribution has no service, account, analytics, network asset or audio.

## Verification

The locked install, type check, unit suite, fresh browser build, browser journeys and final build all passed with the compatibility combination above:

- `npm ci` completed with no reported vulnerabilities.
- `npm run typecheck` passed.
- `npm test` passed all 35 unit tests.
- `npm run test:e2e` built from the current source and passed all 26 Playwright journeys in 3.5 minutes. The journeys cover every grid size, keyboard and pointer play, accessibility names and announcements, active mismatch timing, visibility pauses, score records, snapshots and resume, storage failures, touch scrolling, reduced motion, offline file play, layout and all 128 card faces.
- `npm run build` produced the single-file offline distribution at `dist/index.html`.
- The replay CLI returned the expected one-pair snapshot for the documented replay and rejected an unsupported version with empty stdout and nonzero exit status.

## Evidence

The tests save reproducible render and accessibility evidence:

- [44px grayscale face sheet](evidence/faces-grayscale-44px.png) shows all 128 shape, marker and fill combinations from the actual SVG component.
- [Keyboard journey accessibility tree](evidence/keyboard-journey.json) records the 4x4 journey: native controls, closed and revealed cards, matched cards, each turn announcement, the final moves and time, Tab exit and a new game. The browser is Chromium `156.0.8078.4`; the test runner is Playwright `1.64.1`.
- Layout captures: [4x4 desktop](evidence/layout-desktop-1280x800-4x4.png), [16x16 desktop](evidence/layout-desktop-1280x800-16x16.png), [16x16 phone](evidence/layout-mobile-360x800-16x16.png), [16x16 zoom equivalent](evidence/layout-zoom-640x400-dpr2-16x16.png), and the [zoom-equivalent completion summary](evidence/layout-zoom-640x400-dpr2-4x4-win.png).
- Completion and offline captures: [static completion banner](evidence/completion-banner-static.png), [completed import](evidence/completed-import.json), and [offline file play](evidence/offline-file-win.png).

No physical screen reader was used. Spoken output and a real-device touch long press remain user-acceptance checks as described in [Input](docs/input.md#screen-reader) and [the out-of-scope list](docs/README.md#out-of-scope).
