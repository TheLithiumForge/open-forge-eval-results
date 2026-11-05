Tournament mode is built and working. All checks pass: typecheck, 158 unit and static tests, and 85 of 85 browser journeys (77 existing plus 8 new), run from a fresh build. Nothing is committed.

**Caveat on the test runs:** this container only has Node 22.23.4, which is below the project's minimum of 24.19, and the system Chromium 153. So the runs were not on the named test combination and didn't use the named-combination flag. I wrote that into the root `README.md` rather than claiming named-combination evidence.

**How it works** (project root `/home/user/eval-run/l4-f2-tournament/project`):
- **Tournament button:** sits between New Game and Restart, so Restart stays the control just before the board. Several existing keyboard tests depend on that.
- **Setup:** Players select (4 or 8), fields labelled Player 1 to Player 8, Start tournament, and a Back to game button.
- **Name checks** follow the project's name policies: names are trimmed, inner spaces collapsed and normalized; 2 to 20 characters ("Use 2 to 20 characters."); no repeats regardless of case ("Each name must be different.").
- **Bracket rules from the competition docs:**
  - Seeds follow entry order: 1v4, 2v3 for four players; 1v8, 4v5, 3v6, 2v7 for eight.
  - Rounds show "Round: Quarterfinal/Semifinal/Final" and use 4x4, 6x6 and 8x8 boards.
  - Every match gets a different deal, and both players play it.
  - Fewer moves wins, then less active time, then the higher seed.
- **Turns:** the status line shows "Now playing: NAME" and goes through the page's single live region. Start turn begins a game; Next turn or Next match appears when it ends. At the end, "Champion: NAME" appears with Back to game.
- **Leaving:** Leave tournament, Tournament during an unfinished game, and loading over an unfinished tournament all ask first in a native dialog with Keep playing and Leave. Escape keeps playing.
- **Bracket:** a table with caption "Bracket" and columns Match, Player, Moves, Time and Winner.
- **Past tournaments:** stored under `np3:tournaments` in the `{"v":3,"items":[...]}` shape, newest 10 kept, and they survive reload. If storage is blocked the tournament still plays and the section shows "Progress won't be saved on this device."
- **Tournament JSON:** export is `neon-pairs/tournament` version 1 with keys in alphabetical order. Load reports the first unknown field ("Unknown field: NAME.") or "Invalid tournament." and keeps the draft.
- **Saved settings:** tournament games never change the saved grid size or best scores. The session now has a `competition` flag that enforces this.

**Choices I made that you may want to change** (all listed in `docs/competition/competition-flow.md`):
- **Board hidden after each game:** otherwise the second player would see a solved copy of the same deal.
- **Play order:** the first player listed in a match plays first.
- **Exact times kept:** results keep exact milliseconds in exports and saved records, so a reloaded tournament decides every tie the same way.
- **Export leaves out a game in progress:** loading the export starts that turn again.
- **Unfinished tournaments are not saved:** only finished ones are; an unfinished one is lost on reload.
- **"Game" heading:** the game screen now has a small "Game" heading, because the focus rules need somewhere for focus to land when returning from the Tournament screen.
- **Messages in one place:** tournament messages appear only in the status line, not a second time beside the JSON box.
- **Wording I chose:** "Loaded tournament. Now playing: NAME.", "Loaded completed tournament." and "No tournament to export." (when Export is pressed on the setup screen).

**Decision for you:** I added rule C15 (the Tournament button) to `docs/interface/controls.md` without changing the spec version from 2.2. Whether this makes it spec 2.3 is a release decision.

**Things that were already wrong before this change:**
- `npm run format:check` fails on most files under `docs/` and `.agents/` in the original commit. Code and test files pass.
- Snapshot and replay imports still don't show the "Unknown field" message the project's import rules call for. I left that alone.

**Files:**
- New code is in `src/game/tournament/`. The main logic is `rules.ts`; `format.ts` handles the JSON and `storage.ts` the past tournaments list, each with a test file beside it. The screens are `use-tournament.ts`, `TournamentScreen.tsx` and `LeaveDialog.tsx`.
- Changed: `src/game/Game.tsx`, `src/game/session/session.ts`, `src/game/session/use-game.ts`, `src/game/controls/Controls.tsx`, `src/game/status/GameStatus.tsx`, `src/game/board/Board.tsx`, `src/game/game.css`.
- New browser tests: `tests/tournament-play.e2e.test.ts` and `tests/tournament-controls.e2e.test.ts`, with helpers in `tests/tournament-fixture.ts`. I updated `tests/accessibility.e2e.test.ts`, which needed one extra Tab for the new button, and added tournament screens to `tests/spacing.e2e.test.ts`.
- Docs: new page `docs/competition/competition-flow.md`, listed in `docs/README.md` and the competition catalogue. About 35 existing doc pages that said tournaments, name fields, dialogs or result tables didn't exist were corrected, and the root `README.md` describes the mode. The open choices are also saved as a not-yet-accepted record in `.agents/memory/emerging/tournament-open-questions.md`.
