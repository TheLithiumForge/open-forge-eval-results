Tournament mode is built and working. Typecheck, the 197 unit tests (including the project's source-rule tests) and Prettier all pass, and so does the full browser suite, 86 tests. That suite was 77 before and the 9 new ones are the tournament journeys. I did not commit anything.

I ran the browser tests on Node 22.23.4 and the system Chrome 153 (`PLAYWRIGHT_CHROMIUM_EXECUTABLE=/usr/bin/google-chrome`), not the README's named Node 26.12.1 and Chromium 156 combination. I ran `npm ci` first, which added the git-ignored `node_modules` and `.npm-cache`.

**How it behaves**
- **Opening it:** the Tournament button sits right after New Game and replaces the game screen. If a game is in progress it pauses, and Back to game returns to it with Resume.
- **Setup:**
  - The Players select offers 4 or 8, and the Player 1 to Player N inputs match it.
  - A blank name plays as its own label, such as "Player 3". Names are trimmed and limited to 24 characters. Duplicate names, ignoring case, are refused with "Player names must be different."
  - Start tournament, or Enter, starts it.
- **Turns:**
  - The screen shows "Now playing: NAME" and the match's deal code. The board only appears after Start turn.
  - When a game ends, Next turn appears. When a match ends, Next match appears.
  - The final match goes straight to "Champion: NAME", with Back to game and New tournament.
  - Leave tournament returns to setup and saves nothing.
- **Winning:**
  - Fewer moves wins.
  - A tie goes to the shorter time, then to the player listed first. You didn't specify a tie rule, so this is my choice; it's shown on screen and in the README.
- **Deals:**
  - Every match has its own deal, shared by its two players.
  - All deals use the grid size of the game you opened Tournament from, and tournament games never touch the saved bests.
- **Bracket:** each match shows its players, moves and time, and its winner, with "To be decided" until earlier matches finish.
- **Past tournaments:** finished tournaments are saved in browser storage (20 newest, under the key `neon-pairs.tournaments.v1`). They are listed on the setup screen with a View bracket button and survive a reload.
- **Export and Load:**
  - Export tournament and Load tournament work on every Tournament screen, using a "Tournament JSON" box. A finished tournament loaded this way is added to Past tournaments.
  - On the setup screen, Export saves the typed players with fresh deals as a tournament that has not started.
  - Game progress inside a turn isn't saved, so loading restarts that turn on the same deal. Invalid JSON leaves the screen unchanged.

**Changes to existing code and tests**
- **Game.tsx, Controls, control-labels, use-game:** wired in the button and the pause.
- **session.ts:** one new notice, for a game paused when opening Tournament.
- **BoardHelp.tsx:** the board help text moved here so both screens share it.
- **accessibility journey test:** the new button adds a Tab stop, so I added one Tab and one Shift+Tab to that test and a `tournament` entry to its fixture JSON.
- **spacing test:** I moved its spacing-scale checker into `tests/spacing-scale.ts` so the tournament tests can reuse it.
- **README:** a new Tournament section.

I followed the project rules as the source tests encode them: files under 200 lines, no type escapes, every export imported somewhere, yes/no checks named `is` or `has`, and spacing on the existing scale.

The new code is in `src/game/tournament/`, with unit tests beside it. The new browser tests are `tests/tournament.e2e.test.ts` and `tests/tournament-transfer.e2e.test.ts`, with a helper in `tests/tournament-fixture.ts`.
