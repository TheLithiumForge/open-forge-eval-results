# Neon Pairs

A silent, offline browser memory game. Open [dist/index.html](dist/index.html) directly, or run `npm run dev`. The [product specification](docs/README.md) describes play, accessibility and the versioned reproduction formats.

## Development

Use Node.js 24.19 or newer and npm. Run `npm ci`, then:

- `npm run dev` serves the game locally.
- `npm run typecheck` checks the TypeScript projects.
- `npm test` runs game rule and format tests.
- `npm run test:e2e` builds fresh and runs Playwright browser checks.
- `npm run build` type-checks and creates the self-contained `dist/index.html`.
- `npm run --silent replay -- PATH` reads a replay and prints its final snapshot. Invalid input reports an error on stderr and exits nonzero.

The browser checks use a file URL with HTTP requests blocked for offline play, and a local HTTP origin for storage. The game keeps progress in memory; use the reproduction panel to export or import a snapshot.

## Verification

The locked install, type check, build, unit tests and browser checks were run with Node 26.12.1, npm 11.20.0, Playwright 1.64.1 and Chromium 156.0.8078.4. The browser checks include a complete keyboard game and an accessible-name/ARIA snapshot assertion. No screen reader was used; spoken output and real-device touch long press remain user acceptance checks.
