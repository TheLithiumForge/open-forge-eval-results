# Neon Pairs

A quiet memory game built from [specification 2.2](docs/README.md). Open [dist/index.html](dist/index.html) directly in a browser to play offline. The HTML includes React, styles and SVG artwork; it makes no network requests.

Choose a grid from 4x4 through 16x16. Reveal two cards with a click, tap, Enter or Space. Use the arrow keys to move through the board and Tab to leave it. Matches stay visible; a miss closes after 800 active milliseconds. Hidden pages pause time. New Game deals another board; Restart repeats the current deal. Grid size and best moves are saved when browser storage is available. Game progress stays in memory until exported.

Under **Reproduce a game**, load a board code such as `np1-4-1`, or export and paste snapshot JSON. An unfinished imported snapshot stays paused until Resume. Completed imports show a static result and do not replace your best. Version 1 formats and exact generation rules are documented in [Reproducibility](docs/reproducibility.md).

## Development

Use Node.js 24.19 or later and npm. Package versions are pinned in `package.json` and `package-lock.json`.

```sh
npm ci
npm run dev
npm run typecheck
npm test
npm run test:e2e
npm run build
npm run --silent replay -- PATH
```

`test:e2e` first builds current source and stops if the build fails, then serves that distribution on port 4173 for browser checks in fresh contexts. It also checks the HTML from disk with networking disabled. It stops its server when finished. If Chromium is not installed, run `npx playwright install chromium` before browser tests.

The replay command reads a UTF-8 JSON file, writes only the final snapshot JSON to stdout and exits zero. Invalid or unreadable files produce an error on stderr, no stdout and a nonzero exit code. For example:

```json
{"version":1,"boardCode":"np1-4-1","actions":[{"atMs":0,"index":0},{"atMs":0,"index":11}],"endMs":800}
```

That replay finishes with one matched pair, one move and 800ms elapsed. The browser intentionally has no replay control.

## Structure

The code follows [Architecture](docs/architecture.md). `src/Game.tsx` composes the interface. Pure generation, turns, logical time, snapshot validation and replay live directly under `src/game`. Browser clocks, visibility, preferences and best scores live in `src/game/session`. Board navigation and artwork live in `src/game/board`; deal and reproduction controls live in `src/game/controls`. Status presentation lives in `src/game/status`. Unit tests and styles sit beside their behavior. Complete browser journeys live in `tests`; Node entry points live in `scripts`. Authored TypeScript files stay below 200 lines. Browser and Node compiler projects are separate and use the required strict options.

## Verification

Compatibility run on 4 November 2026: Node **26.12.1**, npm **11.20.0**, Playwright **1.64.1**, Chromium **156.0.8078.4**. React **19.3.1**, TypeScript **7.0.2**, Vite **8.3.5** and Vitest **5.0.5** use the exact documented pins.

- Locked install: `npm ci` passed.
- Compiler projects and single HTML build: `npm run typecheck` and `npm run build` passed. The distribution contains only `dist/index.html` (about 239 kB).
- Unit tests: `npm test` passed, 77 tests in 7 files. Coverage includes independent literal generation vectors, all sizes, turn timing, caps, snapshot constraints, replay ordering and CLI behavior, and malformed or unavailable storage.
- Browser journeys: `npm run test:e2e` passed all 23 journeys in a fresh full run (2.9 minutes), including complete games at every size, pointer/touch/keyboard input, active-time pauses, reset isolation, snapshot Resume, best-score persistence, offline disk play, large-board touch scrolling, full focus outlines and reduced motion.

The browser suite records a complete keyboard 4x4 game with Playwright accessibility snapshots, including closed position names, matched face names, the final announcement, native Tab exit and starting another game. Evidence is generated in [artifacts/accessibility-before.yml](artifacts/accessibility-before.yml) and [artifacts/accessibility-completed.yml](artifacts/accessibility-completed.yml). No screen reader was used; spoken output remains for user acceptance, as I17 specifies. A real-device long press also remains for user acceptance. Visibility timing is automated with controlled `visibilitychange` events and a monotonic test clock.

The [44px grayscale face sheet](artifacts/faces-grayscale.html) and its [PNG](artifacts/faces-grayscale.png) support visual review of all 128 identities, including diagonal markers on solid and outlined squares. Browser checks cover 360x800 and 1280x800 large boards, plus the 640x400 layout at device scale 2 used for the specified zoom equivalent. Native touch swipes reach the last card on both board axes; keyboard focus checks include first, middle and last cards with their complete outlines. Preferences are checked on a local HTTP origin; file URL storage is browser-dependent. Storage failures leave the current session playable.
