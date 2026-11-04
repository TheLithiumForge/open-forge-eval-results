All four bugs are fixed in `/home/user/eval-run/l4-p1-four-bugs/project`. Typecheck passes and the 138 unit tests pass. All 75 browser journeys pass, but only with a workaround: `npm run test:e2e` fails as-is because the installed Chromium doesn't match the version Playwright 1.64.1 expects. I ran it with `PLAYWRIGHT_CHROMIUM_EXECUTABLE` pointing at `/opt/pw-browsers/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell`, so this is not the README's named combination.

I changed no tests, since the existing ones already describe the intended behavior (R10, V17, V18, I05–I07, S01/S02).

1. **Best score** (`src/game/session/storage.ts`, `src/game/status/GameStatus.tsx`):
   - `rememberBest` was overwriting the saved best on every win. It now keeps the existing best unless the new result has fewer moves (R10).
   - A size with no record showed `0`. It now shows `Best: none`.
2. **Arrow keys** (`src/game/board/use-board-focus.ts`, `src/game/board/Board.tsx`): the keyboard handler was missing, so I added it.
   - **Movement:** Left, Right, Up and Down move focus one card at a time. They stop at the edges and never activate a card (I06, I07).
   - **Other keys:** any modifier combination and every other key is left to the browser. Enter and Space still use the native button click.
   - **Focus and scroll:** the card's existing focus handler records the new tab stop and scrolls it into view.
3. **Reduced motion** (`src/game/board/card.css`, `src/game/status/status.css`): added `prefers-reduced-motion: reduce` rules. They turn off the card border transition and the win banner pulse, so the banner shows static (V17, V18).
4. **Beeping** (`src/game/session/use-game.ts`): removed the `chime` function, its tone constants and the call on match and win. The game is silent again (S01, S02).

`npm run format:check` still reports 13 files with style issues. All of them are in `tests/` or `scripts/`, none in `src`, and I didn't touch them.
