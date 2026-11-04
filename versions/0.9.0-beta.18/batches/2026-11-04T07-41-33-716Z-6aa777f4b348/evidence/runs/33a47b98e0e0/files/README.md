# Neon Pairs
Neon Pairs is a browser memory game that asks you to find every matching pair.

Read [Neon Pairs game specification and document map](docs/README.md) to build the game.

Follow the requirements in docs/ for this project.

## Development

Use Node.js 26.12.1 and npm 11.20.0 for the named compatibility combination.

```sh
npm ci
npm run dev
npm run typecheck
npm test
npm run test:e2e
npm run build
npm run --silent replay -- path/to/replay.json
```

`npm run build` writes the offline `dist/index.html`. The end-to-end command builds
the current source and serves that build over a local HTTP origin before opening
fresh browser contexts. The Node.js and browser TypeScript projects are checked
separately.

## Verification and evidence

Verified on 2026-11-04 with Node.js `26.12.1`, npm `11.20.0`, Playwright
`1.64.1`, and bundled Chromium `156.0.8078.4` (the browser's
`HeadlessChrome/156.0.8078.4` user agent):

- `npm ci` completed from the lockfile with 0 reported vulnerabilities.
- `npm run typecheck` passed.
- `npm test` passed: 41 tests across 12 files.
- `npm run test:e2e` rebuilt the app, then passed all 21 browser journeys.
- `npm run build` passed and wrote `dist/index.html` (247,399 bytes; 77.15 kB gzip).
- The browser journeys ran `npm run --silent replay -- PATH` against valid and
  invalid examples. Valid replay printed its final snapshot; invalid input exited
  unsuccessfully without writing stdout.

The offline journey opened the built HTML directly from disk in a browser context
with network access disabled, completed and restarted a game, loaded a known
board code, and asserted there were no requests for sibling files or HTTP URLs.
Saved preferences and records were checked through a local HTTP origin.

The hidden-page timing journey simulates visibility by overriding
`document.visibilityState` inside the test and dispatching `visibilitychange`;
the game ships with no visibility test hook. Accessibility tree captures use
Playwright's Chromium `Locator.ariaSnapshot()`. No screen reader was used, so
spoken confirmation remains for manual user acceptance.

Evidence:

- Keyboard journey accessibility trees: [keyboard-journey.txt](evidence/accessibility/keyboard-journey.txt)
- Grayscale 44px review sheet of all 128 faces: [facesheet.png](evidence/faces/facesheet.png) ([source HTML](evidence/faces/facesheet.html))
- Replay input and output: [example.json](evidence/replay/example.json), [example-output.json](evidence/replay/example-output.json), [invalid-output.txt](evidence/replay/invalid-output.txt)
- Browser layout captures: [desktop](evidence/ui/desktop.png), [phone](evidence/ui/phone.png), [desktop 16x16](evidence/ui/desktop-large-board.png), [phone 16x16](evidence/ui/phone-large-board.png)
