# Neon Pairs

Neon Pairs is an offline browser memory game. Open [dist/index.html](dist/index.html) directly, or run `npm ci` and `npm run dev` for a local development server. Select a grid size and find all matching pairs. The collapsed reproduction panel accepts board codes and snapshots; the complete rules and document map are in [docs/README.md](docs/README.md).

## Commands

- `npm ci` installs the locked dependencies.
- `npm run dev` starts the development server.
- `npm run typecheck` checks the browser and Node TypeScript projects.
- `npm test` runs the pure game tests.
- `npm run test:e2e` builds from current source and runs the browser journeys.
- `npm run build` type checks and produces the self-contained `dist/index.html`.
- `npm run --silent replay -- PATH` prints the final snapshot for a valid replay file. Invalid input exits nonzero and reports the error on stderr.

## Verification

On 4 November 2026, the locked `npm ci`, type check, unit tests, fresh build and browser journeys passed with Node 26.12.1, npm 11.20.0, Playwright 1.64.1 and Chromium 156.0.8078.4. The browser tests open the built HTML directly with network requests blocked and use a local HTTP origin for storage. [Accessibility-tree evidence](docs/accessibility-evidence.md) records the keyboard game. No screen reader was used; spoken results and a physical-device long press remain user acceptance checks.
