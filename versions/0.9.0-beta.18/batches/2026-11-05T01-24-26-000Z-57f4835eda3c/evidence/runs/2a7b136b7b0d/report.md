Tournament mode is built and working. Type checking, all 156 unit tests and all 88 browser journeys pass (77 existing, 11 new). One caveat on that: this machine has Node 22.23.4 with Chrome for Testing 153, not the project's named Node 26.12.1 / Chromium 156 combination, so the README's tested-combination record doesn't cover this run. Nothing is committed; the changes are in the working tree.

**How it works**
- **Opening it:** the Tournament button sits between New Game and Restart. Opening it replaces the main area and moves focus to the screen's "Tournament" heading. Back to game returns focus to a new "Solo game" heading. The solo game keeps its state while you're away and its clock doesn't run.
- **Players:** a Players select (4 or 8) and inputs labelled Player 1–8. Start tournament tidies each name (trims it, collapses inner spaces, normalizes the Unicode) and then checks it. A name under 2 or over 20 characters shows "Use 2 to 20 characters." A repeat, ignoring case, shows "Each name must be different." Entries and focus stay put.
- **Bracket rules:** seeds follow entry order. Openings are 1v4, 2v3 for four players and 1v8, 4v5, 3v6, 2v7 for eight. "Round: Quarterfinal/Semifinal/Final" is shown, on 4x4, 6x6 and 8x8 boards. Every match gets its own deal, different from every other match, and both players play it.
- **Turns:** "Now playing: NAME" goes through the page's single live region. The board waits closed until Start turn, which moves focus to the board. When a game ends its board stays up and Next turn or Next match appears. After the final, "Champion: NAME" appears with Back to game.
- **Winner:** fewer moves wins. Equal moves go to the lower exact active time, not the displayed seconds, then to the higher seed.
- **Saved data:** tournament games never change the saved size or best scores. The in-tournament stats show Moves, Pairs and Time, without Best.
- **Bracket table:** captioned "Bracket", with Seed, Player, Moves and Time columns. Moves read like "18 moves", unplayed games "Not played", and the winner gets "(winner)".
- **Leave tournament:** opens a native dialog. Keep playing takes focus and Escape keeps playing. Leave goes back to player entry and saves nothing.
- **Past tournaments:** stored under `np3:tournaments`, newest first, keeping 10, as a table of entrants and champion. A damaged stored value is quietly treated as empty and left alone until the next save. If storage is blocked, finished tournaments stay for the visit and the screen shows "Progress won't be saved on this device."
- **Tournament JSON:** every Tournament screen has the box with Export tournament and Load tournament. Exports are tagged `neon-pairs/tournament`, version 1, with keys in alphabetical order. A bad load shows "Unknown field: NAME." for the first unknown field, otherwise "Invalid tournament.", and keeps both the current tournament and the draft.

**Decisions you may want to revisit**
- Leave tournament returns to the player-entry screen rather than straight to the solo game.
- Before a tournament starts, Export tournament describes the tournament the typed names would create, deals included. With invalid names it shows the name message instead.
- Loading a tournament resumes at its next unplayed game. A game that was mid-play when exported isn't included.
- Loading an already finished tournament shows its champion but doesn't add it to Past tournaments.
- I added a visible "Solo game" heading to the main screen so Back to game has somewhere to put focus, as the focus rules require.
- I added a C15 requirement to `docs/controls.md` for the button's placement.

**Changes to existing tests:** the existing accessibility test now tabs past the extra button. The spacing check moved into `tests/spacing-scale.ts` so the new tournament screens reuse it.

**Formatting:** `npm run format:check` already failed before my changes, on about 100 files in `docs/`. That includes several docs I edited, which I left unreformatted. All code, `README.md` and the new `docs/tournament.md` pass.

**Where things are** (all under `/home/user/eval-run/l4-f2-tournament/project`):
- Tournament code: `src/game/tournament/`. Pure rules are in `rules.ts`, `names.ts`, `format.ts` and `past-tournaments.ts`, each with a test file beside it.
- Changed existing code: `src/game/Game.tsx`, `src/game/session/session.ts`, `src/game/session/use-session-clock.ts`, `src/game/session/use-game.ts`, `src/game/controls/Controls.tsx`, `src/game/status/GameStatus.tsx`, plus the new `src/game/board/BoardHelp.tsx`.
- New browser tests: `tests/tournament*.e2e.test.ts` and `tests/tournament-fixture.ts`.
- Docs: new `docs/tournament.md`. Updated: `docs/README.md`, `controls.md`, `architecture.md`, `acceptance.md`, `source-layout.md`, the `competition-*` pages, the related policy pages and the project `README.md`.
