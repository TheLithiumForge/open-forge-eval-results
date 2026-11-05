Tournament mode is built and all checks pass: typecheck, 161 unit and source-audit tests, and 88 browser journeys (the 77 existing ones plus 11 new). One caveat on the browser results: they ran on Node 22.23.4 with Chromium 156 revision 1243 (Playwright's expected 1248 wasn't installed). That is not the named combination, so the README's tested-combination record is unchanged.

**How it works**
- **Opening it:** the Tournament button sits between New Game and Restart. It switches to the Tournament screen, and the solo game keeps its progress with its clock stopped until you come back.
- **Setup:** a Players select (4 or 8), inputs labelled Player 1 to Player 8, Start tournament, and Back to game. Names are trimmed, inner spaces collapsed and Unicode normalized. A name outside 2 to 20 characters shows "Use 2 to 20 characters.", and a repeat (ignoring case) shows "Each name must be different."
- **Pairings and boards:** seeds follow entry order. Four players open 1v4 and 2v3; eight open 1v8, 4v5, 3v6 and 2v7. Rounds are Quarterfinal on 4x4, Semifinal on 6x6 and Final on 8x8. Every match gets its own board code, chosen when the tournament starts.
- **Turns:**
  - Each turn shows "Round: NAME" and the match, such as "Semifinal 1: Ada against Dev". The status line shows "Now playing: NAME".
  - Start turn deals the board.
  - A finished game shows Next turn, or Next match when the match is over.
  - Fewer moves wins, then less active time, then the higher seed.
- **Leave tournament** asks first in a native dialog with Keep playing (focused, also what Escape does) and Leave.
- **Bracket:** a table with Match, Player, Moves, Time and Winner.
- **End:** when the final ends, the heading becomes "Champion: NAME" with Back to game.
- **Export and Load:** every screen has the Tournament JSON box. The export has a `"format": "neon-pairs/tournament"` field, a whole-number version and alphabetical keys. A bad load shows "Unknown field: NAME." for the first extra field, or "Invalid tournament." otherwise, and keeps your draft.
- **Past tournaments:** finished tournaments are saved under `np3:tournaments`, newest 10 kept, and appear on the setup and champion screens after reload. If storage is blocked, that table says "Progress won't be saved on this device." A corrupt saved value reads as empty and is left alone until the next save.
- **Solo records:** tournament games never change the saved board size or best scores. The browser test checks the stored preferences are byte-for-byte unchanged.

**Choices I made that you may want to revisit** (also saved in `.agents/memory/emerging/tournament-open-choices.md`):
- Load tournament replaces an unfinished tournament without the leave dialog, the same way Load snapshot works today.
- Exporting mid-game leaves the unfinished game out, so loading that export restarts the current player's turn on the same deal.
- The final goes straight to the champion screen; there's no Next match after it.
- The solo screen now has a visible "Solo game" heading, so Back to game has somewhere to put focus as the focus policy requires.
- I left the spec version at 2.2. Adding a mode may deserve 2.3 and release notes.
- Snapshot import still says "Invalid snapshot." for an unknown field, although the import-safety policy asks for "Unknown field: NAME." there too. That was out of scope.

**Changes outside the new feature**
- Two existing browser tests needed updates because of the new button and clock behaviour: the accessibility journey has one more tab stop, and the timer-lifecycle tests now share a counting helper.
- Shared game code was adjusted so solo and tournament play use the same turn logic and clock: `session.ts`, `use-session-clock.ts` (now able to pause while its screen is hidden), `use-game.ts`, `fresh-board.ts`, `GameStatus.tsx` (Best is optional), `Controls.tsx` and `game.css`.
- `npm run format:check` still warns about 214 Markdown files. That count is the same before my change; all code files pass.
- Nothing is committed.

**Files**
- New spec: `/home/user/eval-run/l4-f2-tournament/project/docs/competition/competition-tournament.md`.
- Updated docs: 23 pages under `docs/` (competition, interface policies, persistence, sharing, architecture) plus the root `README.md`, wherever they said the tournament didn't exist yet.
- Feature code: `/home/user/eval-run/l4-f2-tournament/project/src/game/tournament/`.
- Wiring: `/home/user/eval-run/l4-f2-tournament/project/src/game/Game.tsx`.
- New browser tests: `/home/user/eval-run/l4-f2-tournament/project/tests/tournament.e2e.test.ts`, `tournament-contract.e2e.test.ts` and `tournament-layout.e2e.test.ts`, with the helper `tournament-fixture.ts`.
