# Neon Pairs

A silent, offline browser memory game. See the [product specification](docs/README.md) for the rules, controls and formats.

## Run and build

Requires Node.js 24.19 or later and npm. Run `npm ci`, then `npm run dev` for local development. `npm run build` type-checks and creates the self-contained [dist/index.html](dist/index.html), which can be opened directly from disk. Saved preferences are best checked over HTTP because browser storage for `file:` URLs varies.

Run `npm run typecheck`, `npm test`, and `npm run test:e2e` to check the compiler projects, game core, and fresh production build with browser journeys. Install the Playwright browser if needed with `npx playwright install chromium`. The browser command builds before running and starts and stops its own local preview server.

A replay file can be evaluated with `npm run --silent replay -- PATH`. A valid replay prints the final snapshot JSON; invalid input produces an error on stderr and a nonzero exit code. Board codes, snapshots and replay formats are documented in [Reproducibility](docs/reproducibility.md).

## Verification

The locked install (`npm ci`), type check, unit tests, production build, and browser journeys were run with Node 26.12.1, npm 11.20.0, Playwright 1.64.1, and Chromium 156.0.8078.4. The browser journeys include opening the distribution from disk with network requests blocked, a complete keyboard game, snapshots, storage over HTTP, and large-board layouts. The recorded [accessibility tree evidence](docs/accessibility-evidence.md) comes from Playwright's Chromium accessibility snapshots during the keyboard journey. No screen reader was used; spoken output remains for user acceptance.
