# Neon Pairs

Neon Pairs is an offline browser memory game. Open [dist/index.html](dist/index.html) directly, choose a grid size, and find all matching pairs. The game stores the chosen size and best moves locally when browser storage is available. A new page load starts a fresh deal.

Open **Reproduce a game** to copy or load a board code, or export and load a snapshot. Imported unfinished snapshots pause until Resume. Board codes and the snapshot and replay formats are documented in [Reproducibility](docs/reproducibility.md). The complete product specification starts at [docs/README.md](docs/README.md).

## Development

Use Node.js 24.19 or later and npm:

```sh
npm ci
npm run dev
npm run typecheck
npm test
npm run test:e2e
npm run build
npm run --silent replay -- path/to/replay.json
```

The build writes a self-contained `dist/index.html`. The browser test command builds afresh and runs Playwright against the build, including a direct file URL and a local HTTP origin. Install the Playwright Chromium browser with `npx playwright install chromium` if needed. The replay command prints the final snapshot on success; invalid input produces an error on stderr and a nonzero exit status.

## Verification record

On 4 November 2026, the locked install (`npm ci`), type checking, unit tests, build, and browser journeys passed with Node.js 26.12.1, npm 11.20.0, Playwright 1.64.1, and Chromium 156.0.8078.4. The browser tests inspect Chromium's accessibility tree for the keyboard journey, including closed and revealed card names and the completion announcement. No screen reader was used; spoken output remains for user acceptance. The direct file journey blocks network requests. The browser tests also exercise storage on HTTP, snapshot pause/resume, and 16x16 boards at 360x800, 1280x800 and 640x400 CSS pixels.
