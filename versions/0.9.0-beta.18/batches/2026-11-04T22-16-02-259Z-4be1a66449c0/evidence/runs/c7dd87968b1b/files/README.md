# Neon Pairs

Neon Pairs is an offline memory game. The requirements and game formats are documented in [docs/README.md](docs/README.md).

## Run and build

Use Node.js 24.19 or later and npm 11.20.0 or later.

```sh
npm ci
npm run dev
npm run build
```

The build emits `dist/index.html`, a single HTML file that can be opened directly from disk. To replay a recorded game, run `npm run --silent replay -- PATH`; for example, `npm run --silent replay -- test-fixtures/example.replay.json` prints its final snapshot JSON.

## Verification

The locked install, type check, unit tests, build, and browser journeys passed with Node.js 26.12.1, npm 11.20.0, Playwright 1.64.1, and Chromium 156.0.8078.4. The browser journeys include local-origin storage checks, keyboard play, snapshot resume, large boards, and opening the built HTML from disk with network requests blocked.

Automated accessibility-tree evidence for the keyboard game is saved in [evidence/keyboard-accessibility-tree.yml](evidence/keyboard-accessibility-tree.yml). A screen reader was not used; spoken output remains part of user acceptance as specified in [docs/input.md](docs/input.md).
