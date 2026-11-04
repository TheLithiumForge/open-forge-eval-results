# Neon Pairs

Neon Pairs is a browser memory game. Read [the product specification](docs/README.md) for its rules and controls.

## Commands

```sh
npm ci
npm run dev
npm run typecheck
npm test
npm run test:e2e
npm run build
npm run --silent replay -- PATH
```

`npm run build` typechecks the browser and Node projects, then writes the self-contained game to `dist/index.html`. That HTML can be opened directly from disk. `npm run test:e2e` builds from current source before starting Playwright against the fresh build. The replay command prints the final version 1 snapshot on success and writes an error to stderr with a nonzero exit on invalid input.

## Verification

Verified with Node `26.12.1`, npm `11.20.0`, Playwright `1.64.1` and its Chromium `156.0.8078.4` build.

- `npm ci` installed the pinned lockfile successfully; npm reported no vulnerabilities.
- `npm run typecheck` passed for both compiler projects.
- `npm test` passed all 15 unit tests across five files.
- `npm run build` passed and emitted `dist/index.html` (240,013 bytes).
- `npm run test:e2e` built from source and passed all nine browser journeys, including the keyboard game and `ariaSnapshot()` accessibility-tree assertions in `e2e/game.spec.ts`, repeated live announcements, visibility pause/resume, storage reload, snapshot resume, mismatch restart, large-board and zoom-equivalent layouts, and direct-from-disk play with no network requests.
- No screen reader was used; spoken output remains part of user acceptance.
