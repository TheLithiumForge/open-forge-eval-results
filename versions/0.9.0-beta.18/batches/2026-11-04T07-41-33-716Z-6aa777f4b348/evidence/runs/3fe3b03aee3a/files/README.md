# Neon Pairs
Neon Pairs is a browser memory game that asks you to find every matching pair.

Read [Neon Pairs game specification and document map](docs/README.md) to build the game.

Follow the requirements in docs/ for this project.

## Run

Use Node.js 26.12.1 and npm 11.20.0. Install the pinned dependencies with **npm ci**, then start the development server with **npm run dev**.

Play from the resulting local page or open [dist/index.html](dist/index.html) directly. The distribution is a single 243.29 kB HTML file with its script, styles and artwork inline.

## Check

Run the project checks and build with **npm run typecheck**, **npm test**, **npm run build** and **npm run test:e2e**.

These commands passed with Node.js 26.12.1, npm 11.20.0, Playwright 1.64.1 and Chromium 156.0.8078.4. The unit suite passed 21 tests across 6 files. The fresh-build browser suite passed 18 journeys, including offline file play, all seven board sizes, saved scores, keyboard and touch input, visibility pauses, zoom and reduced motion. Browser tests used a local HTTP origin for storage checks and blocked network requests while opening the HTML file.

Replay a JSON file with **npm run --silent replay -- e2e/fixtures/example-match.json**. That replay prints one version 1 snapshot with one matched pair, one move and 800 elapsed milliseconds. The invalid example at [invalid-replay.json](e2e/fixtures/invalid-replay.json) writes an error to stderr, prints nothing to stdout and exits nonzero.

## Acceptance evidence

- [Keyboard accessibility-tree journey](docs/evidence/keyboard-accessibility.md) records closed, revealed and matched card names, the completed game and its live announcement.
- [44px grayscale face sheet](docs/evidence/faces-44px-grayscale.png) shows all 128 face identities using the production card border, padding and artwork.

No screen reader was used for this implementation. Spoken announcements and the real-device long-press context menu remain part of user acceptance, as described in [Input](docs/input.md) and [Acceptance](docs/acceptance.md).
