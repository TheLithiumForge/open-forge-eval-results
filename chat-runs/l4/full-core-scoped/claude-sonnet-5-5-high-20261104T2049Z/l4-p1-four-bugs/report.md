All four bugs are fixed. Typecheck and Prettier pass, and all 138 unit tests pass. I couldn't run the browser tests (`npm run test:e2e`): Playwright's Chromium isn't installed here, so every e2e test failed at browser launch. The arrow-key fix and the reduced-motion CSS are therefore only checked by typecheck and the existing unit tests, not in a browser.

I followed the project rules: I read `.agents/loader.md`, `docs/README.md`, the Rules (R10), Input (I06/I07), Visuals (V17/V18) and Sound (S01/S02) docs. The `.agents` memory and directive folders had no entries. I ran `npm ci` to install dependencies.

**What was wrong and what I changed:**
1. **Best score** (`src/game/session/storage.ts`, `src/game/status/GameStatus.tsx`): `rememberBest` overwrote the saved best on every win, so a worse game could replace it. It now keeps the existing best when the new result is equal or worse (R10). A size with no record showed `Best: 0`; it now shows `Best: none`.
2. **Arrow keys** (`src/game/board/Board.tsx`): the handler was missing. I added one on the board. Unmodified ArrowLeft, ArrowRight, ArrowUp and ArrowDown move focus within the row or column, stop at the board edges, and don't activate a card. Other keys and modifier combinations are left to the browser (I06/I07). I avoided a type cast because `scripts/source-audit.test.ts` forbids them.
3. **Reduced motion** (`src/game/board/card.css`, `src/game/status/status.css`): under `prefers-reduced-motion: reduce`, the card border transition and the win-banner pulse are now off (V17/V18).
4. **Beeping** (`src/game/session/use-game.ts`): I removed the `chime()` function and the call that played a tone on a match or win. The spec requires a silent game (S01/S02).

Prettier also reflowed one existing line in `Board.tsx`. I reverted an unrelated change it made to `src/game/replay.ts`.
