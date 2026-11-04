# Neon Pairs

Neon Pairs is an offline browser memory game. Open [dist/index.html](dist/index.html) directly, or run `npm run dev` for a local server. The full requirements are in [the specification](docs/README.md).

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

The build writes a standalone `dist/index.html`. The browser tests build fresh output, check that file with network requests blocked, and use a local HTTP server to check saved preferences. The replay command prints the final snapshot JSON, or reports invalid input on stderr and exits nonzero.

## Verification

On 4 November 2026, `npm ci`, `npm run typecheck`, `npm test`, `npm run test:e2e`, and `npm run build` passed with Node.js 26.12.1, npm 11.20.0, Playwright 1.64.1 and Chromium 156.0.8078.4. Unit tests include the published deck and replay vectors and completion of all supported board sizes. Browser tests cover an offline keyboard game, the accessibility tree, snapshots, reset timing, storage, a large board and the zoom-equivalent layout.

The keyboard journey checks accessible names and the accessibility tree using Playwright's `ariaSnapshot` in Chromium. No screen reader was used; spoken output and a real-device touch long press remain for user acceptance as specified in [Input](docs/interface/input.md).
