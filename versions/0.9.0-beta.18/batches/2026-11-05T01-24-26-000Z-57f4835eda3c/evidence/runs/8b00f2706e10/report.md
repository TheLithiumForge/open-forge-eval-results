Tournament mode is working in /home/user/eval-run/l4-f2-tournament/project. Type check passes, all 158 unit and source-audit tests pass, and all 84 browser tests pass through `npm run test:e2e`. 77 of those were already there; 7 are new. That run used Node 22.23.4 and Chrome for Testing 153, because the project's named Node 26 and Chromium 156 setup isn't on this machine, so it isn't the official record. I didn't commit anything.

**What players get**
- **Opening it:** a Tournament button sits right after New Game. It switches to the Tournament screen and moves focus to its "Tournament" heading.
- **Setup:** a Players select (4 or 8), fields labelled Player 1–8, and Start tournament. Names are trimmed, inner spaces collapsed and Unicode-normalized. A name outside 2–20 characters shows "Use 2 to 20 characters."; a repeat in any capitalization shows "Each name must be different."
- **Bracket and boards:** seeds follow entry order (1v4, 2v3; or 1v8, 4v5, 3v6, 2v7). "Round: NAME" shows while a round is played. Quarterfinals use 4x4 boards, semifinals 6x6 and the final 8x8. Both players in a match get the same deal, and no two matches share one.
- **Turns:** "Now playing: NAME" goes through the page's single status area. Start turn shows the board and focuses the first card. After a game, Next turn or Next match appears and the board hides at the handoff.
- **Winning a match:** fewer moves wins, then lower play time, then the higher seed.
- **Results:** a "Bracket" table shows each player's moves and time and each match's winner. At the end "Champion: NAME" appears with a Back to game button.
- **Leave tournament:** asks first in a dialog with "Keep playing" (focused, and Escape does the same) and "Leave".
- **Saved records:** tournament games never change the saved board size or best scores. Finished tournaments are kept on the device, newest 10, and shown in a "Past tournaments" table. Unreadable saved data shows as an empty list and is left alone until the next save. If storage is blocked, the screen says "Progress won't be saved on this device."
- **Export and load:** every Tournament view has Export tournament, Load tournament and a Tournament JSON box. An unrecognised field shows "Unknown field: NAME."; anything else wrong shows "Invalid tournament." Either way the current tournament stays.

**Choices you may want to change** (the request didn't settle these):
- **End of the final:** the champion appears straight away; there is no Next match button after the final. "Champion: NAME" is added to the last game's result in the same status message.
- **Single status area:** "Now playing" and "Champion" appear only there. The first result of a turn replaces "Now playing", so it isn't shown for the whole turn. Load errors also appear next to the JSON box, so that text shows twice on the page.
- **Leaving the normal game:** pressing Tournament during an unfinished game asks the same Keep playing / Leave question first. Back to game starts a fresh deal at the saved size.
- **Export before starting:** Export on the setup view writes a new tournament with fresh deals for the typed names. Loading a finished tournament doesn't add it to Past tournaments.
- **Button names clash:** Playwright's default, non-exact match on the dialog's "Leave" button also finds "Leave tournament". The words come from the project's dialog rule and your request, so I kept both.

**Changes to existing behaviour and tests**
- I updated the keyboard accessibility test (`tests/accessibility.e2e.test.ts`), because the new button adds one Tab stop.
- The deal buttons no longer wrap their text.
- The status bar can now hide the Best line; tournament games use that.
- `npm run format:check` already failed before my work, on 104 docs files. All the code passes.

**Where things are**
- New code is in `src/game/tournament/` (rules, bracket, names, export format and saved-records modules, each with tests, plus the hooks, components and CSS) and `src/game/board/BoardHelp.tsx`. Existing files I changed include `src/game/Game.tsx` and `src/game/session/session.ts`.
- New tests: `tests/tournament.e2e.test.ts` (a full four-player tournament), `tests/tournament-controls.e2e.test.ts`, `tests/tournament-fixture.ts`, plus a Tournament-screen spacing check in `tests/spacing.e2e.test.ts`.
- Docs: a new spec page `docs/competition/tournament.md`, linked from `docs/README.md`, with small updates to four other docs. `README.md` gets a usage paragraph and a note recording this test run.
