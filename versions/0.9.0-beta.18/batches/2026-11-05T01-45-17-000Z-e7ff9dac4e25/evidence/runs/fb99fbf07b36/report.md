Tournament mode is in. Typecheck, unit tests (189 passing), build and the full browser suite (90 passing, 13 of them new for this feature) all pass. Prettier is clean on `src`, `tests`, `scripts`, `art`, `README.md` and `docs/tournament.md`. `npm run format:check` over the whole repo still fails, as it did before I started, because about 100 existing files under `docs/` aren't prettier-formatted. I ran everything on Node 22, since the sandbox has no Node 24, so none of this counts as a record on the named Node 26.12.1 combination.

**What a player sees**
- The Tournament button sits right after New Game and opens a screen with a Players select (4 or 8), Player 1–N inputs and Start tournament.
- Each match shows "Round: NAME" and "Now playing: NAME". Start turn begins a game. Next turn or Next match appears when a game or match ends, and Leave tournament asks first.
- At the end, "Champion: NAME" and Back to game appear, and the tournament joins the Past tournaments list. That list survives reload.
- The bracket is a table with each match's players, moves, time and board code, with "(winner)" after the winner's name.
- The Tournament JSON box with Export tournament and Load tournament is on every Tournament screen.

**Project rules applied**
- **Pairing and boards:** seeds come from entry order. Eight players open 1v8, 4v5, 3v6, 2v7; four players open 1v4, 2v3. Quarterfinals are 4x4, semifinals 6x6, the final 8x8. Every match gets its own board code, drawn through the project's one allowed random source, and both players of a match play that code.
- **Winner:** fewer moves, then lower active time in whole milliseconds, then the higher seed.
- **Names:** trimmed, whitespace-collapsed and NFC-normalised. 2–20 code points ("Use 2 to 20 characters."), no case-insensitive repeats ("Each name must be different.").
- **Live region:** "Now playing" and "Champion" go through the page's single live region.
- **Focus:** opening the screen, starting, leaving and Back to game all land on a `tabindex="-1"` h2. I added an h2 "Game" to the game screen for that.
- **Leaving:** the native dialog has Keep playing and Leave. Keep playing takes focus and Escape keeps playing.
- **Saved records:** stored as `np3:tournaments` with `{"v":3,"items":[…]}`, newest 10 kept. A blocked store keeps the list in memory and shows "Progress won't be saved on this device."
- **Export:** `format: "neon-pairs/tournament"`, `version: 1`, keys alphabetical at every level. Load validates before replacing anything and answers "Unknown field: NAME." or "Invalid tournament.".
- **Isolation:** tournament games run in a private session that is never saved, so they can't change the saved size or best moves. A browser test checks the stored preferences are byte-identical afterwards.
- **Layout:** controls are at least 44px at 390px wide, spacing stays on the scale, and nothing animates.

**Changes to existing code**
- `activateSession` takes an optional `recordBest` flag. `useSessionClock` and `useGame` take an optional `suspended` flag, so the solo game's clock waits while the Tournament screen is open (tested).
- `GameStatus` can now omit its Best row. `Controls` gets the Tournament button, and `control-labels.ts` gets its label.
- I updated `tests/accessibility.e2e.test.ts` for the new Tab stop (one more Tab forward and one more Shift+Tab back).
- New code is in `src/game/tournament/`: `rules.ts`, `names.ts`, `exchange.ts`, `records.ts`, `view.ts`, `turn-session.ts`, the hooks, and the components with `tournament.css`.
- New spec page `docs/tournament.md` (requirements M01–M18). Short updates to `README.md`, `docs/README.md`, `controls.md`, `source-layout.md`, `dialog-policy.md`, `focus-policy.md`, `announcements-policy.md`, `text-entry-policy.md`, `tables-policy.md`, `persistence-envelope.md`, `competition-overview.md` and `competition-scores.md`, which said competition didn't exist yet.

**Judgment calls to check**
- After Leave, the player lands on the Tournament entry screen, not the game. The request didn't say which.
- Before a tournament starts, Export writes the entry list as a draft with no matches, and Load restores it into the form. I did this so Export works on every screen.
- Load tournament replaces the current tournament without asking, like Load snapshot does. A loaded finished tournament is not added to Past tournaments.
- A turn's clock keeps running while the leave dialog is open, because the docs don't say it should pause.
- The bracket scrolls sideways inside its own focusable region on phones so the page itself never overflows.

**Files:** all paths are under `/home/user/eval-run/l4-f2-tournament/project`.
- `src/game/tournament/*`
- `src/game/Game.tsx`
- `src/game/controls/Controls.tsx`
- `src/game/controls/control-labels.ts`
- `src/game/session/session.ts`
- `src/game/session/use-game.ts`
- `src/game/session/use-session-clock.ts`
- `src/game/status/GameStatus.tsx`
- `src/game/game.css`
- `tests/tournament-fixture.ts`
- `tests/tournament.e2e.test.ts`
- `tests/tournament-entry.e2e.test.ts`
- `tests/tournament-exchange.e2e.test.ts`
- `tests/tournament-layout.e2e.test.ts`
- `tests/accessibility.e2e.test.ts`
- `docs/tournament.md`
