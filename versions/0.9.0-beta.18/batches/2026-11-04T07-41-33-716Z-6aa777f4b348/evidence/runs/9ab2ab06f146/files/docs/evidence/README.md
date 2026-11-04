# Verification artifacts

Captured from the successful 29-journey browser run on 4 November 2026 with
Playwright 1.64.1 and Chromium 156.0.8078.4 on Linux. Node 26.12.1 and npm 11.20.0
were used for the locked install, build and tests. The project README records
commands and results.

- [Accessibility journey](accessibility-journey.txt): Playwright `ariaSnapshot()`
  output at the initial board, first reveal, keyboard completion and next game.
  The test also checks focus, native Tab exit and the exact turn announcements.
  No screen reader was used; spoken output remains user acceptance work.
- [Grayscale faces](faces-44px-grayscale.png): all 128 face identities rendered
  from the production `Face` component inside 44px squares with 2px borders.
  This development-only sheet is absent from the shipped HTML. Shape, marker
  direction and solid/outline fill were visually reviewed, including diagonal
  markers on squares.
- [360x800](layout-360.png), [1280x800](layout-1280.png),
  [640x400 at scale 2](layout-640-2x.png): full-page captures of a completed 4x4
  import. The same journeys measure and play both 4x4 and 16x16 boards, check
  page width, minimum targets and scroll limits, and move focus to first, last
  and middle cards while checking space for the entire focus outline.

Run `npm run test:e2e` to rebuild and regenerate evidence under `test-results/`.
The test server is managed by Playwright and is closed when its run finishes.
