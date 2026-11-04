# Neon Pairs acceptance record

Recorded 4 November 2026 for Node.js `26.12.1`, npm `11.20.0`, Playwright `1.64.1` and Chromium `156.0.8078.4`.

## Commands

| Command | Result |
| --- | --- |
| `npm ci` | Passed; installed 50 packages from the lockfile, with 0 vulnerabilities reported. |
| `npm run typecheck` | Passed for both compiler projects. The Node project includes the CLI, Vite and Playwright configuration, e2e specs and helpers. |
| `npm test` | Passed: 54 tests across 9 files. |
| `npm run build` | Passed; produced the single-file `dist/index.html` at 240,681 bytes. |
| `npm run test:e2e` | Passed: fresh build followed by 19 tests across 8 Playwright spec files. The final run used one worker and fresh contexts. |
| `npm run dev -- --host 127.0.0.1 --port 5173 --strictPort` | Started and served the app over local HTTP. The server was stopped after the smoke check. |

`npm run test:e2e` uses `npm run build && playwright test`; a failed build prevents the browser run. Playwright starts and stops its own Vite preview server. No development server, browser or watcher process remained after verification.

## Acceptance coverage

- Finished all seven supported boards (4x4 through 16x16), covering 812 card positions. The test computes expected pairs from the visible board code with a separate implementation of the documented algorithm.
- Checked repeated selection, immediate matches, move counts, blocked input during a mismatch, and the 799ms/800ms close boundary. Exercised visibility pause, imported pause/Resume, remaining mismatch time, remembered focus, old timer invalidation, better/equal/worse best scores and reload persistence.
- Imported an unfinished snapshot, resumed it and completed the game to check that its live win updates the best. Imported a completed snapshot to check it stays static and keeps the saved best unchanged.
- Checked board-code and snapshot drafts, exact invalid-load statuses, focus retention, export, supported-size persistence, malformed and invalid saved preferences, unrelated storage keys, and storage denial. HTTP storage checks ran against the local preview origin.
- Completed a keyboard-only 4x4 journey with named controls, roving focus, face names, matched-card state, one polite atomic turn announcement per move, combined final match/win announcement and native Tab exit. Consecutive identical misses each generated a new announcement, while mismatch closure generated none.
- Checked primary click, tap, right-click, hover and pointer cancellation. Real touch swipes scrolled the 16x16 board to the last card; the first card was also tapped at the initial top-left position.
- Measured 16x16 layout at 360x800 and 1280x800, plus the 640x400 CSS-pixel / device-scale-2 zoom equivalent. Checked the 44px card minimum, page width, board scroll limit and padding, first/middle/last focus outlines, controls reachability and pointer/keyboard play at zoom.
- Captured a grayscale sheet from the rendered card elements at 44px, with 32px SVG artwork, and checked all 128 unique face SVGs. Checked green matched hover, reduced motion, one 600ms live-win pulse and static completed imports.
- Opened `dist/index.html` from `file:` with HTTP(S) requests blocked, played a match and Restarted. The build contains no audio element, audio API call or audio file reference. Replay CLI coverage checked valid stdout JSON and invalid stderr/exit behavior.

## Evidence files

- [Automated accessibility tree for the 4x4 keyboard journey](accessibility/4x4-keyboard-journey.yml)
- [Grayscale sheet of all 128 faces at application card size](artworks/grayscale-facesheet.html)
- [Desktop screenshot at 1280x800](layout/desktop-1280x800.png)
- [Phone screenshot at 360x800](layout/mobile-360x800.png)
- [Zoom-equivalent screenshot at 640x400, device scale 2](layout/zoom-640x400-dsf2.png)

## Manual acceptance boundaries

The headless browser stayed visible. The visibility test overrides `document.hidden` in its test context and dispatches a `visibilitychange` event to exercise the session listener; `document.visibilityState` itself remains visible. No screen reader was used, so spoken-output confirmation remains user acceptance. A real-device touch long-press context-menu check also remains manual.
