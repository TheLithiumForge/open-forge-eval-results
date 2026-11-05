Tournament mode is built, with the docs updated to match. Typecheck passes and unit tests pass (27 files, 180 tests). The full browser suite, run once before two small test edits, passed 92 of 93. The one failure was the existing keyboard journey, which needed an extra Tab for the new button. I updated it and reran it with the tournament test, and both passed. Nothing was committed.

The browser tests ran on Chrome 153 and Node 22 (set through `PLAYWRIGHT_CHROMIUM_EXECUTABLE`), not the README's named Chromium 156 / Node 26 combination. So the README's tested-versions record is untouched and the named-combination run is not done. `prettier --check` passes on `src`, `tests`, `scripts` and `art`. It fails on `docs/` (about 210 files) before and after my changes, so I did not reformat docs.

**How the project rules shaped it**
- **Name checks:** the CLI isn't installed, so I followed the loader by hand and read the competition, interface, persistence, sharing, architecture and writing docs. Names are trimmed, collapsed and NFC-normalized. They must be 2 to 20 code points ("Use 2 to 20 characters.") and unique ignoring case ("Each name must be different.").
- **Bracket rules:** pairings are 1v4, 2v3 for four players and 1v8, 4v5, 3v6, 2v7 for eight. Rounds read "Round: Quarterfinal/Semifinal/Final" on 4x4, 6x6 and 8x8 boards. Every match gets a different full board code, drawn through `freshBoardCode`. Ties go to fewer moves, then less active time in milliseconds, then the higher seed.
- **Results table:** the bracket is a `<table>` with a caption and `th scope="col"` headers. A winner shows "(winner)" after the name.
- **Screens and dialog:** each screen's h2 has `tabindex="-1"` and takes focus. Leave tournament opens a native `<dialog>` with Keep playing (focused) and Leave, and Escape keeps playing.
- **Live region:** there is still only one on the page. "Now playing: NAME", validation errors and load results all go through it.
- **Saved list:** `np3:tournaments` holds `{"items":[…],"v":3}` and keeps the newest 10. Corrupt data reads as empty. Blocked storage shows "Progress won't be saved on this device."
- **Export format:** the JSON has `format: "neon-pairs/tournament"` and `version: 1`, with keys in alphabetical order at every level. Load rejects the first unknown field as "Unknown field: NAME." and anything else as "Invalid tournament."
- **Isolation:** tournament games run in their own session, so saved size and best moves never change. A browser test confirms this with seeded preferences.
- **Layout rules:** controls are at least 44x44 at 390px wide and spacing stays on the scale, both checked in browser tests. Files stay under 200 lines, rules are in `src/game/tournament/rules.ts` (React-free) with unit tests beside them, and new exports are all imported.

**Choices of mine you may want to change**
- The Tournament button sits directly after New Game, so the bar reads New Game, Tournament, Restart.
- After the Final's second game the screen goes straight to "Champion: NAME" with Back to game; there is no Next match button for the last match.
- Opening Tournament while a solo game is running keeps that game and stops its clock until Back to game. This needed a small `suspended` option on the session clock.
- Export on the setup screen exports the entry form as a draft with no matches. Load accepts that draft and refills the form.
- Load tournament replaces the current tournament without asking, like Load snapshot. Only Leave tournament asks first.
- A tournament loaded from JSON is shown but not added to Past tournaments. Only one played to its end here is.
- A running tournament is not saved across a reload. Export it first to keep it.

**Changes outside the tournament folder**
- `Game.tsx` now switches between the solo page and the tournament screen.
- Two small components were pulled out so both screens share them: `status/GameResult.tsx` (the one live region) and `board/BoardHelp.tsx`.
- `GameStatus` takes an optional `showBest`, and the tournament turn hides Best.
- The spacing helper moved to `tests/spacing-audit.ts` so tournament screens get the same audit.
- Docs: I added `docs/competition/competition-tournament.md` and edited about 20 existing pages. I left the spec version at 2.2 and did not touch history or ADR pages.

New code is in `src/game/tournament/`. Tests are `src/game/tournament/*.test.ts` plus `tests/tournament*.e2e.test.ts` (including `tests/tournament-fixture.ts`).
