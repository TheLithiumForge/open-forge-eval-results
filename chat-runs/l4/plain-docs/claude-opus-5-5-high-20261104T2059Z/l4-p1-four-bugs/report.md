I fixed all four problems in /home/user/eval-run/l4-p1-four-bugs/project/src, following the specs in docs/. The type check passes, all 141 unit tests pass and all 75 browser tests pass. Nothing is committed; the changes are in the working tree.

1. **Best score:** a finished game used to overwrite the saved best whatever the result. Now only a lower move count replaces it; an equal or worse game keeps the old best (rule R10). A size you've never finished used to show `Best: 0` and now shows `Best: none`.
   - `src/game/session/storage.ts`: `rememberBest` keeps the existing record unless the new result is better.
   - `src/game/status/GameStatus.tsx` and `src/game/status/status-labels.ts`: the empty value is now the word "none".

2. **Arrow keys:** the code that handled them was missing completely. Up, down, left and right now move focus one card at a time and stop at the board's edges. Moving never reveals a card or changes the move count. With Shift, Ctrl, Alt or Cmd held, the arrows are left to the browser, as the input spec (I06, I07) requires.
   - New file `src/game/board/board-keys.ts` works out which card focus moves to.
   - `src/game/board/use-board-focus.ts` and `src/game/board/Board.tsx` connect it to the board.
   - New unit tests are in `src/game/board/board-keys.test.ts`.

3. **Reduced motion:** with reduced motion turned on, the cards' border change is now instant and the win banner appears without its pulse (V17, V18). The changes are in `src/game/board/card.css` and `src/game/status/status.css`.

4. **Beeping:** the sound played on each match and on a win is gone from `src/game/session/use-game.ts`, so the game is silent again (S01, S02).

**Things to know:**
- **Node version:** this machine has Node 22.23.4 and npm 10.9.9. That's older than the project's minimum of Node 24.19 and isn't the named combination (Node 26.12.1, npm 11.20.0). Everything passed anyway, but the README's test record shouldn't count this run, so I left it unchanged.
- **Formatting:** `npm run format:check` still reports 13 files: every file in `docs/`, `scripts/replay.test.ts`, `tests/accessibility.e2e.test.ts` and `tests/layout.e2e.test.ts`. They were already like that before I started, and all my changes are formatted correctly. I didn't run the formatter because it would rewrite the spec documents.
- **Installed tools:** `npm ci` and the Chromium download added `node_modules`, `.npm-cache`, `.playwright-browsers`, `.browser-work`, `dist`, `.art`, `.session` and `test-results` inside the project. They're all git-ignored, and no servers are still running.
