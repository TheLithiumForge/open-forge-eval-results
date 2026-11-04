All four bugs are fixed, and typecheck, the 141 unit tests and the build pass. I could not run the browser tests: `npm run test:e2e` built fine, but all 75 tests failed at launch because the Playwright Chromium binary isn't installed here. So the arrow-key, reduced-motion and silence fixes are not confirmed in a real browser.

1. **Best score:**
   - `rememberBest` in `src/game/session/storage.ts` always overwrote the saved best. It now keeps the existing best unless the new move count is strictly lower (R10).
   - `src/game/status/GameStatus.tsx` showed `0` for a size with no record. It now shows `Best: none`.
2. **Arrow keys:** the board had no key handling at all.
   - I added `src/game/board/arrow-move.ts`, with a test in `src/game/board/arrow-move.test.ts`. Left and right move within the row, up and down within the column, and focus stops at the edges.
   - `src/game/board/Board.tsx` calls it for unmodified arrow keys only. It moves focus without activating a card, and other keys are left to the browser.
3. **Reduced motion:**
   - I added `prefers-reduced-motion: reduce` rules in `src/game/board/card.css` (card transition off) and `src/game/status/status.css` (win-banner pulse off, so the banner shows static).
4. **Beeping:** `src/game/session/use-game.ts` played a tone on every match and win, which breaks the silence requirement (S01 and S02). I removed the audio code entirely.

I kept to the project rules: the new code has no `any` or casts, files are well under 200 lines, test names carry no requirement IDs, and the touched source files pass Prettier. `prettier --check .` still flags other files (the docs, some tests and scripts) that I didn't change.

`node_modules` and the build output are git-ignored, so the working tree holds only the source changes above.
