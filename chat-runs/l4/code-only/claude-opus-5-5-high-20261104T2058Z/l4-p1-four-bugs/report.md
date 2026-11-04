I fixed all four problems. The type check, the unit tests (138) and the browser tests (75) all pass. The browser tests ran on this machine's Node 22.23.4 and npm 10.9.9 with Chromium 156.0.8078.4, not on the README's named setup (Node 26.12.1, npm 11.20.0), so I ran them without the named-setup flag. Nothing is committed.

The project rules I followed are the ones in `scripts/source-conventions.test.ts` and `scripts/source-audit.test.ts`. One of those rules bans audio in the game's code, so the beep was breaking a project check as well as being unwanted.

**1. Best score**
- A finished game always overwrote the saved best. `rememberBest` in `src/game/session/storage.ts` now keeps the old best unless the new game took fewer moves.
- A size you've never finished showed `0`. It now shows `Best: none`, which is what the tests expect (`src/game/status/GameStatus.tsx`).

**2. Arrow keys**
- The arrow-key handling for the cards had been removed. I added it back in `src/game/board/use-board-focus.ts` and connected it in `src/game/board/Board.tsx`.
- Each arrow press moves one card up, down, left or right, stops at the board edges and scrolls the card into view.
- Arrows held with Shift, Ctrl, Alt or Cmd, and all other keys, still go to the browser as before.

**3. Reduced motion**
- Nothing turned the animations off when reduced motion was on. With the setting on, the cards no longer animate (`src/game/board/card.css`) and the win banner no longer pulses (`src/game/status/status.css`).

**4. Beeping**
- I removed the code that played a tone on each pair found and on a win (`src/game/session/use-game.ts`).

**Formatting check:** `npm run format:check` still fails. That's not from my changes: three test files (`scripts/replay.test.ts`, `tests/accessibility.e2e.test.ts`, `tests/layout.e2e.test.ts`) only have line-wrapping differences, and I left them alone because they're outside this task. Running `npm run format` would fix them.

The install, browser download, build and test results are all in the project's gitignored folders (`node_modules/`, `.playwright-browsers/`, `.browser-work/`, `dist/`, `test-results/`).
