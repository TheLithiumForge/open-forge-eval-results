# Neon Pairs

Neon Pairs is a browser memory game that asks you to find every matching pair. Read the [game specification](docs/README.md) for the full requirements.

## Install and run

Use Node.js 26.12.1 and npm 11.20.0 for the recorded compatibility combination.

```sh
npm ci
npm run dev
```

The game also has these project commands:

| Command | Purpose |
| --- | --- |
| `npm run typecheck` | Check browser and Node TypeScript projects |
| `npm test` | Run pure game unit tests |
| `npm run test:e2e` | Build from source and run Playwright journeys against the build |
| `npm run build` | Typecheck and emit the offline `dist/index.html` |
| `npm run --silent replay -- PATH` | Validate a replay file and print its final snapshot JSON |

Open `dist/index.html` directly for offline play. Use a local HTTP origin when checking saved size and best scores.

## Verification record

Recorded on 2026-11-04. The compatibility combination passed the locked install, typecheck, build, unit tests and browser journeys.

| Check | Result | Versions |
| --- | --- | --- |
| Locked install (`npm ci`) | Passed | Node.js 26.12.1, npm 11.20.0 |
| Typecheck and build | Passed; emitted `dist/index.html` | TypeScript 7.0.2, Vite 8.3.5 |
| Unit tests (`npm test`) | Passed; 15 tests | Vitest 5.0.5 |
| Browser journeys (`npm run test:e2e`) | Passed; 6 journeys, including the offline file and 16x16 layouts | Playwright 1.64.1, Chromium 156.0.8078.4 |

The automated accessibility-tree record for the 4x4 keyboard journey is in [evidence/keyboard-journey.aria.txt](evidence/keyboard-journey.aria.txt). No screen reader was used.
