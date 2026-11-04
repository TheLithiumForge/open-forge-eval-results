# Neon Pairs

Find every matching pair in an offline browser memory game. The product contract starts at [docs/README.md](docs/README.md).

Use Node.js 24.19 or later and npm. The named compatibility combination is Node `26.12.1`, npm `11.20.0`, Playwright `1.64.1` and Chromium `156.0.8078.4`. All direct package versions are pinned in `package.json` and `package-lock.json`.

```sh
npm ci
npm run dev
npm run typecheck
npm test
npx playwright install chromium
npm run test:e2e
npm run build
npm run --silent replay -- path/to/replay.json
```

The browser command builds current source before testing and stops if the build fails. Browser contexts are fresh for each test. `npm run build` type checks the browser, Node and test projects, then creates the self-contained [dist/index.html](dist/index.html). Open that file directly to play offline. Check saved preferences on an HTTP origin, because disk-URL storage depends on the browser.

The replay command prints only the final version 1 snapshot JSON on success. Invalid replay input produces a message on stderr and a nonzero exit code. Board, snapshot and replay formats are defined in [Reproducibility](docs/reproducibility.md).

Implementation follows [Architecture](docs/architecture.md): pure rules and formats in `src/game`, browser effects in `src/game/session`, board navigation and artwork in `src/game/board`, and native controls in `src/game/controls`. Focused tests stay beside their behavior; browser journeys live in `tests/e2e`.

Verified on 4 November 2026 with the exact named combination: Node `26.12.1`, npm `11.20.0`, Playwright `1.64.1` and Chromium `156.0.8078.4`.

- `npm ci` installed the locked dependencies successfully; all direct versions match the specification.
- `npm run typecheck` passed all three compiler projects.
- `npm test` passed 114 tests in ten colocated files.
- `npm run test:e2e` built current source and passed all 39 browser journeys in fresh contexts, using three workers.
- `npm run build` emitted one offline HTML file, about 239 kB. The disk journey played through completion with networking blocked and made no HTTP requests.
- `npm run --silent replay -- PATH` passed valid JSON-only output and invalid/missing-file stderr/nonzero-exit checks, including a path containing spaces.
- `npm run dev` served both the page and application entry with HTTP 200, then its server was stopped.

Browser journeys cover all seven board sizes, exact active-time deadlines, short mismatch intervals after Resume and visibility return, stale timers, snapshots, best scores, storage failures, pointer/touch/keyboard input and live announcements. Visibility edge tests use a controlled monotonic clock and test-only visibility events. Native touch swipes and keyboard navigation reach both ends of large boards. Layout checks cover 360x800, 1280x800 and the 640x400/device-scale-2 zoom equivalent. The architecture audit found no authored TypeScript file above 200 lines and no shipped test fixture, solver endpoint, audio or external asset.

Evidence from the built game:

- [Complete keyboard journey and accessibility trees](evidence/keyboard-accessibility.md)
- [All 128 faces in 44px grayscale targets](evidence/faces-grayscale.png)
- [Phone 4x4](evidence/default-360.png) and [16x16 with keyboard focus](evidence/large-board-360.png)
- [Desktop 4x4](evidence/default-1280.png) and [16x16](evidence/large-board-1280.png)
- [Zoom-equivalent 4x4 completion](evidence/zoom-4.png) and [16x16 completion](evidence/zoom-16.png)

Visual review confirmed that shape, marker and fill distinguish all 128 faces, including diagonal markers on solid and outlined squares. No screen reader was used. Spoken output and real-device long-press confirmation remain user acceptance, as the specification defines.
