# Neon Pairs

Neon Pairs is an offline browser memory game. Open [dist/index.html](dist/index.html) to play, or run `npm run dev` for a local server. Select a grid size, find matching cards, and use **Reproduce a game** to load a board code or export and import a snapshot. An imported unfinished snapshot pauses until Resume. Board navigation uses the arrow keys; Enter or Space reveals a card.

The complete requirements and document map are in [docs/README.md](docs/README.md).

## Development

Use Node.js 24.19 or later and npm. Run `npm ci`, then:

- `npm run dev` starts the development server.
- `npm run typecheck` checks the browser and Node TypeScript projects.
- `npm test` runs the pure game tests.
- `npm run test:e2e` builds the current source and runs the browser journeys.
- `npm run build` checks types and produces the self-contained `dist/index.html`.
- `npm run --silent replay -- PATH` prints a replay's final snapshot, or reports an invalid replay on stderr with a nonzero exit status.

## Verification

The locked install, build, unit tests and browser journeys were run with Node 26.12.1, npm 11.20.0, Playwright 1.64.1 and Chromium 156.0.8078.4. Browser tests open the built HTML from disk with network requests blocked, and use a local HTTP origin for saved preferences. The keyboard completion journey checks accessible roles and names, matched state, turn and win announcements, and an accessibility-tree snapshot. No screen reader was used; spoken output remains for user acceptance.
