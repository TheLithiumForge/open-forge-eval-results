# Neon Pairs
Neon Pairs is an offline browser memory game that asks you to find every matching pair.

Read [Neon Pairs game specification and document map](docs/README.md) to build the game.

Follow the requirements in `docs/` for this project.

## Development

Install the locked dependencies with `npm ci`. Start the development server with `npm run dev`. The production build is a single offline file at `dist/index.html`.

```sh
npm run typecheck
npm test
npm run test:e2e
npm run build
```

Replay a version 1 replay file with `npm run --silent replay -- PATH`. Valid input prints only the final snapshot JSON. Invalid input writes an error to stderr and exits nonzero.

## Verification record

The locked install, build, unit tests and browser journeys passed on 4 November 2026 with Node.js `26.12.1`, npm `11.20.0`, Playwright `1.64.1` and Chromium `156.0.8078.4`. `npm test` passed 28 unit tests; `npm run test:e2e` passed 12 browser journeys, including direct-file launch, local-storage reload, the 16x16 board and the 200% zoom viewport.

The automated accessibility-tree output is in [evidence/accessibility-tree.md](evidence/accessibility-tree.md). The 44px grayscale sheet of all 128 face identities is in [evidence/face-sheet.png](evidence/face-sheet.png). No screen reader was used; spoken-output confirmation remains part of user acceptance.
