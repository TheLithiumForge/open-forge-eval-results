# Neon Pairs

Neon Pairs is an offline browser memory game. Open [dist/index.html](dist/index.html) directly, or use `npm run dev` to serve it locally. The full product requirements are in [docs/README.md](docs/README.md).

## Development

Use Node.js 24.19 or later and npm. Install the locked dependencies with `npm ci`.

- `npm run dev` starts the local development server.
- `npm run typecheck` checks the browser and Node TypeScript projects.
- `npm test` runs the game rule and format tests.
- `npm run test:e2e` builds the current source and runs browser journeys against that build, including the HTML opened from disk.
- `npm run build` type checks and creates the single offline `dist/index.html`.
- `npm run --silent replay -- PATH` prints the final snapshot for a valid replay JSON file. Invalid files report an error on stderr and exit nonzero.

## Verification

The locked install, build, unit tests, and browser journeys were run with Node.js 26.12.1, npm 11.20.0, Playwright 1.64.1, and Chromium 156.0.8078.4. The browser tests inspect accessibility-tree snapshots during a complete keyboard game; no screen reader was used. Spoken screen-reader output and real-device touch long-press behavior remain user acceptance checks. The offline journey blocks network requests, while preference persistence is checked on a local HTTP origin.
