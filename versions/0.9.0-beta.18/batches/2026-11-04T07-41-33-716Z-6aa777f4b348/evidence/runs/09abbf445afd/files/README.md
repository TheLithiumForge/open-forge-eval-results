# Neon Pairs

Neon Pairs is an offline memory game. Reveal two cards per turn, match every pair, and improve your move count. It supports mouse, touch and keyboard play across seven square board sizes.

## Play and share a deal

Choose a grid size, then reveal a card and find its match. A missed pair closes after 800 milliseconds of active page time. Matches stay face up. Use the arrow keys to move around the board and Enter or Space to reveal the focused card. The game is silent and draws each face as inline SVG.

`New Game` deals a fresh board at the current size. `Restart` repeats the same deal. The collapsed **Reproduce a game** panel accepts a board code or a saved snapshot and can export a readable snapshot.

Board codes use `np1-N-seed`, such as `np1-4-1`. They reproduce the same deal. Version 1 snapshots save progress; version 1 replays record timed actions. Run a replay with:

```sh
npm run --silent replay -- tests/fixtures/example.replay.json
```

Valid replay output is only the final snapshot JSON on stdout. Invalid input writes an error to stderr, leaves stdout empty, and exits nonzero.

## Code layout

- `src/game` contains the deterministic deal generator, game transitions, snapshot validation and replay engine as pure functions.
- `src/game/session` connects the game to React state, active-time timers, page visibility and saved preferences.
- `src/game/board` contains the card grid, SVG faces and remembered keyboard focus.
- `src/game/controls` contains native game and reproduction controls.
- `src/Game.tsx` composes the interface and its single polite live region.
- `e2e` contains test-only browser journeys, helpers and evidence generation.

The browser session owns clock and storage effects. The board uses native buttons, the size choice is a native select, and no external assets or services are needed to play. The checked-in architecture is described in [docs/technology/architecture.md](docs/technology/architecture.md).

## Build and verify

Use Node.js 24.19 or later with npm. The tested compatibility combination and command results are recorded below.

```sh
npm ci
npm run typecheck
npm test
npm run build
npm run test:e2e
```

`npm run test:e2e` builds from the current source, then runs Playwright against that build through the Vite preview server. Browser tests use fresh contexts and one worker. `npm run build` writes the single-file distribution to [`dist/index.html`](dist/index.html).

For interactive local development, `npm run dev` starts the Vite server. On a fresh machine, install Playwright's Chromium browser once with `npx playwright install chromium` before running the browser suite.

| Command | Result on 2026-11-04 |
| --- | --- |
| `npm ci` | Installed the locked dependencies; zero vulnerabilities reported. |
| `npm run typecheck` | Passed for both TypeScript projects, including browser tests. |
| `npm test` | 12 unit tests passed across 3 files. |
| `npm run build` | Passed; emitted a 243,488-byte `dist/index.html`. |
| `npm run test:e2e` | Fresh build passed; all 23 Playwright tests passed in 1 minute. |
| Replay example command above | Exited 0 and returned one final snapshot with pair positions 0 and 11, one move and 800ms elapsed. Invalid replay behavior is covered by the browser suite. |

Test versions: Node.js `26.12.1`, npm `11.20.0`, TypeScript `7.0.2`, Playwright `1.64.1`, Chromium `156.0.8078.4`.

## Offline distribution and storage

Open `dist/index.html` directly from disk to play offline. Its scripts, styles and artwork are inline; the browser check blocks network access and sees no external requests or page errors. No audio files or audio APIs are used.

Saved size and best scores use browser local storage. Their persistence was checked on the local HTTP preview server. Storage behavior for `file:` URLs varies by browser, and the game remains playable if storage is unavailable.

## Acceptance evidence

- [Accessibility-tree keyboard journey](evidence/accessibility.md) records the closed and revealed cards, turn results, completion, Tab exit and next game, with browser and tool versions.
- [44px grayscale face sheet](evidence/facesheet.png) shows all 128 face identities.
- Responsive boards: [360px phone](evidence/board-360.png) and [1280px desktop](evidence/board-1280.png).
- Zoom layout: [4×4 board](evidence/zoom-four-by-four.png) and [completion banner](evidence/zoom-completion.png) at 640×400 CSS pixels and device scale 2.
- [Keyboard completion journey](evidence/keyboard-journey.png) and [touch 16×16 board](evidence/touch-16.png).

The visibility-pause browser check dispatches `visibilitychange` with a controlled `document.visibilityState`, because this headless environment kept the page visible when brought forward or minimized. A screen reader was not used; spoken confirmation remains part of user acceptance. A real-device touch long-press context-menu check also remains manual acceptance.
