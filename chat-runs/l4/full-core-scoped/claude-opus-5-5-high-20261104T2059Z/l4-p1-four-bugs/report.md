I fixed all four bugs. The project's checks pass: type check, 141 unit tests, and all 75 browser tests. Nothing is committed.

**1. Best score.** `rememberBest` in `src/game/session/storage.ts` always overwrote the saved best. It now keeps a new score only when it has fewer moves, so an equal or worse game keeps the record. A size you've never finished showed `0` because of `best ?? 0` in `src/game/status/GameStatus.tsx`. It now shows `Best: none`, from a new `bestNone` label in `status-labels.ts`.

**2. Arrow keys.** The board had no arrow-key handling at all. A new file, `src/game/board/keyboard-movement.ts`, maps each arrow key to the next card and stops at the board edges. `use-board-focus.ts` and `Board.tsx` use it. Arrows with Alt, Ctrl, Meta or Shift held, and all other keys, are left to the browser as the spec requires. Moving focus never reveals a card. New unit tests are in `keyboard-movement.test.ts`.

**3. Reduced motion.** With reduced motion on, the card border transition is now turned off (`src/game/board/card.css`). The win banner shows still, with no pulse (`src/game/status/status.css`).

**4. Beeping.** I removed the sound code that played a tone on each match and win from `src/game/session/use-game.ts`. The spec says the game stays silent.

**Project rules:** there is no `open-forge` CLI here, so I followed `.agents/loader.md` by reading the files myself. That covered the catalogues, memory folders and every spec under `docs/`, including the rules, input, visuals, sound, controls and technology docs. No directives, patterns or saved memory applied, and there was nothing worth adding to memory. I didn't change any specs or the README.

**Environment differences:**
- This machine has Node 22, not the 24.19 or later the project requires, so `npm ci` warned about it.
- The installed Chromium build is older than the one Playwright 1.64.1 expects. I ran the browser tests with `PLAYWRIGHT_CHROMIUM_EXECUTABLE=/opt/pw-browsers/chromium-1243/chrome-linux64/chrome`, an override the test harness supports.
- So these results are not a run on the project's named combination of versions.

**Formatting:** `npm run format:check` fails on files that were already out of format. Every file I changed or added passes, and the failure count dropped from 25 to 23 files because two files I edited were reformatted along the way.

`node_modules`, `dist` and `test-results` are now in the project folder; git ignores all three.
