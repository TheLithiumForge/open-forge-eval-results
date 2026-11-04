All four bugs are fixed. The type check and unit tests pass (138 of 138, three of which were failing before). I could not run the browser tests because Chromium isn't installed in this environment, so arrow-key movement and reduced motion are checked by code and the unit tests only.

1. **Best score:** `rememberBest` in `src/game/session/storage.ts` now returns the preferences unchanged when the new result is worse than or equal to the saved best. `GameStatus.tsx` now shows "none" instead of 0 for a size you haven't finished, which matches the "Best: none" text the existing browser tests expect.
2. **Arrow keys:** nothing was handling them anymore. I added a handler in `src/game/board/use-board-focus.ts` and wired it to the board in `Board.tsx`. It moves focus to the neighbouring card and stops at the edges, as the existing browser tests expect. Arrows pressed with a modifier and all other keys are left to the browser, as the README says.
3. **Reduced motion:** `card.css` and `status.css` now turn off the card border transition and the win-banner pulse under `prefers-reduced-motion: reduce`. The normal 120ms transition and 600ms pulse are unchanged.
4. **Beeping:** I removed the `chime` function, its tone constants and the call to it from `src/game/session/use-game.ts`. The project's own source-audit test forbids audio in shipped source.

To run the checks I had to run `npm ci` (this created `node_modules/` and `.npm-cache/`, both git-ignored). The machine runs Node 22, not the Node 26 the README names.

`npm run format:check` still flags three files I did not touch: `scripts/replay.test.ts`, `tests/accessibility.e2e.test.ts` and `tests/layout.e2e.test.ts`. The files I changed are clean.
