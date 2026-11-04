# Neon Pairs
Neon Pairs is a browser memory game that asks you to find every matching pair.

Read [Neon Pairs game specification and document map](docs/README.md) to build the game.

Follow the requirements in docs/ for this project.

## Run and build

Use Node.js `26.12.1` and npm `11.20.0` with the pinned lockfile. Run `npm ci` once to install dependencies, then:

```sh
npm run dev
npm run typecheck
npm test
npm run test:e2e
npm run build
```

`npm run test:e2e` builds the current source before running Playwright against the local preview of that build. The distribution is one self-contained file: open [`dist/index.html`](dist/index.html) directly in a browser to play offline. Browser preferences are checked on a local HTTP origin, because browsers may handle `file:` storage differently.

## Replay a game

The replay command prints the final snapshot JSON for a valid replay file and exits nonzero without stdout for invalid or unreadable input. For example:

```sh
npm run --silent replay -- examples/published-replay.json
```

## Verification

Verified with Node.js `26.12.1`, npm `11.20.0`, Playwright `1.64.1`, and Chromium `156.0.8078.4`. The locked install completed successfully; `npm run typecheck`, `npm test` (34 tests), `npm run test:e2e` (24 browser journeys), and `npm run build` passed.

The offline file was exercised with network access blocked. Browser journeys include a full keyboard game and accessibility tree at [artifacts/accessibility-journey.md](artifacts/accessibility-journey.md), and the 128 face, 44px grayscale review at [artifacts/face-sheet.png](artifacts/face-sheet.png). The accessibility tree was tested with Chromium automation; no screen reader was used, so spoken results remain for user acceptance.

Generate the face review again with `npm run evidence:faces`. It renders the shipped SVG artwork at 44px, in grayscale, outside the game UI.
