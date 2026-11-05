I've added the Tournament mode, and every check passes: type check, 173 unit tests, all 84 browser tests (77 existing plus 7 new) and Prettier. One caveat on that: this machine has Node 22.23 and Playwright's bundled headless Chromium, not the named combination the README asks for (Node 26.12.1, Chromium 156), so the runs were without `NEON_PAIRS_NAMED_COMBINATION`. I pointed the tests at that browser with `PLAYWRIGHT_CHROMIUM_EXECUTABLE=/opt/pw-browsers/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell`. The README still says the checks passed on the named combination, and that hasn't been re-checked for this change. Nothing is committed.

**How it works**
- **Opening it:** Tournament sits between New Game and Restart. The setup screen has the Players select (4 or 8), inputs labelled Player 1 to Player 8, Start tournament and Back to game. Names must not be empty, must differ from each other ignoring letter case, and can be up to 32 characters. A bad name shows a message and puts the cursor in that input.
- **Pairings:** round one pairs Player 1 with 2, 3 with 4, and so on, in the order typed. Later matches take the winners of earlier ones.
- **Deals:** each match gets its own random deal at the grid size free play had selected. Both players in a match get the same deal.
- **Turns:** "Now playing: NAME" is shown with Start turn. When a game ends, Next turn or Next match appears, and Leave tournament is always available. The bracket shows each match's players, moves, time (m:ss) and "Winner: NAME". The end screen shows "Champion: NAME" and Back to game.
- **Saving:** Export tournament and Load tournament, with the Tournament JSON box, are on every Tournament screen. Finished tournaments are kept in browser storage (key `neon-pairs.tournaments.v1`) and shown in Past tournaments, newest first.
- **Project rules:** I followed the rules the existing tests enforce: files under 200 lines, every export used somewhere, no unsafe type casts, yes/no checks named as questions, spacing on the 0/4/6/8/12/16/24/32 scale, and 44px tap targets.

**Choices I made where you didn't specify — easy to change**
- **Ties:** fewer moves wins; equal moves go to the faster time; an exact tie goes to whoever played first.
- **Leaving:** Leave tournament goes back to free play. A tournament left early is not added to Past tournaments.
- **Reloading:** an unfinished tournament isn't saved, so a reload goes back to free play. To keep one, use Export tournament.
- **List size:** Past tournaments keeps the 50 most recent.
- **Bests:** tournament games don't change your saved best moves, and the Best stat is hidden during a turn.
- **What Export saves:**
  - On the setup screen it saves the names typed so far.
  - During a turn it also saves that player's game; after loading, the game continues when they press Start turn.
  - Text that isn't a valid tournament shows "Invalid tournament." and changes nothing.

**Changes to existing code and tests**
- The new button adds a keyboard stop between New Game and Restart, so I updated the existing accessibility test and its fixture to expect it (`tests/accessibility.e2e.test.ts`, `tests/accessibility.fixture.json`, `tests/accessibility-fixture.ts`). The other existing browser tests pass without changes.
- The game now starts from a new app component in `src/game/App.tsx` that switches between free play and the tournament screen. The session test page (`art/session/session-harness.tsx`) renders that instead of the game directly.
- I pulled the page header, the board help text and the game's live message area into small shared components (`src/game/Masthead.tsx`, `src/game/board/BoardHelp.tsx`, `src/game/status/GameResult.tsx`). In `src/game/status/GameStatus.tsx`, passing `best={null}` now hides the Best stat.
- I moved the spacing check into `tests/spacing-scale.ts` so the tournament layout test can reuse it.
- I added a test to `tests/timer-lifecycle.e2e.test.ts` that leaving mid-turn stops that turn's timer.

The README has a new Tournament section.

Files are in /home/user/eval-run/l4-f2-tournament/project:
- `src/game/tournament/` — all the new tournament code and its unit tests
- `tests/tournament.e2e.test.ts`
- `tests/tournament-transfer.e2e.test.ts`
- `tests/tournament-layout.e2e.test.ts`
- `tests/tournament-fixture.ts`
