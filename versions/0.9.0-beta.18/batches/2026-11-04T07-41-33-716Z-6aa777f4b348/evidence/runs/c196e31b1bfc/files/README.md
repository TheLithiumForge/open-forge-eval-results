# Neon Pairs

Neon Pairs is an offline memory game built with React, TypeScript and native browser controls. Match each pair, try all seven board sizes, or share a board code to repeat a deal.

Read the [product specification](docs/README.md) for the complete rules and interface requirements.

## Run and build

Use Node.js `26.12.1` and npm `11.20.0` for the tested compatibility setup. All packages are pinned in `package.json` and `package-lock.json`.

```sh
npm ci
npm run dev
npm run typecheck
npm test
npm run test:e2e
npm run build
```

`npm run test:e2e` builds from current source before starting Playwright against a local HTTP preview. The build fails before browser tests can start if type checking or bundling fails.

The offline distribution is [`dist/index.html`](dist/index.html). Open it directly in a browser; its JavaScript, styles and card artwork are embedded in the file. The browser tests open the built file with external network requests blocked. Use a local HTTP origin when checking saved preferences.

## Replay a deal

The game core exposes version 1 board codes and snapshots. To replay timed card actions from a JSON file:

```sh
npm run --silent replay -- path/to/replay.json
```

Valid input prints the resulting version 1 snapshot JSON. Invalid input prints no stdout and exits with an error. Replay is a developer command and has no game UI control.

## Code layout

- `src/game/boardCode.ts`, `state.ts`, `snapshot.ts` and `replay.ts` hold the pure deal, gameplay and format functions.
- `src/game/session` manages browser time, visibility, saved preferences and best scores.
- `src/game/board` contains keyboard navigation, cards and inline SVG artwork.
- `src/game/controls` contains game and reproduction controls.
- `src/game/Game.tsx` composes the interface; focused unit tests live beside their behavior and browser journeys live in `e2e`.

## Verification record

Verified with Node `26.12.1`, npm `11.20.0`, Playwright Test `1.64.1` and Chromium `156.0.8078.4`.

- `npm ci` — passed with the lockfile.
- `npm run typecheck` — passed for both TypeScript projects.
- `npm test` — 20 unit tests passed.
- `npm run test:e2e` — 31 browser journeys passed; the command built the current source first.
- `npm run build` — passed and produced the single-file distribution.
- `npm run --silent replay -- PATH` — the documented sample produced one match at 800ms; an invalid file exited nonzero.

The browser journeys cover all board sizes, active-time and mismatch behavior, snapshot loading, saved scores, keyboard input, responsive scrolling, device-scale-2 layout, reduced motion and offline launch. They also wrote an [accessibility tree from a complete keyboard journey](artifacts/accessibility-journey.txt), a [44px grayscale sheet of all 128 faces](artifacts/face-sheet-grayscale.png) and a [matched-card sheet showing the check marks](artifacts/matched-face-sheet-grayscale.png).

No screen reader was used. Spoken-result confirmation remains part of user acceptance.
