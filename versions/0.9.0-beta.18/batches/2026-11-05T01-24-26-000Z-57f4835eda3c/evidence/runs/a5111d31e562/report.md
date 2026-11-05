Tournament mode is built and the checks pass: 158 unit tests (140 before) and all 84 browser tests (77 existing plus 7 new). Nothing is committed; everything is in the working tree of `/home/user/eval-run/l4-f2-tournament/project`.

**How it works** (all in `src/game/tournament/`)
- **Opening it:** a Tournament button sits between New Game and Restart and swaps the page for the Tournament screen. The solo game stays in memory with its clock and any pending mismatch paused; Back to game returns to it. Each screen change moves focus to that screen's heading (`tabindex="-1"`).
- **Setup:** a Players select (4 or 8) and inputs labelled Player 1 to Player 8. On Start tournament, names are trimmed, inner spaces collapsed and Unicode normalised, then checked: 2 to 20 characters ("Use 2 to 20 characters."), and no repeats ignoring case ("Each name must be different.").
- **Bracket rules:** seeds follow entry order, with opening matches in the documented order (Ada v Hal, Dev v Emi, Cora v Finn, Bo v Gia). The heading shows "Round: Quarterfinal/Semifinal/Final", played on 4x4, 6x6 and 8x8 boards. Both players of a match get one deal, and every match gets a different one.
- **Winner:** fewer moves, then lower unrounded active time, then the higher seed.
- **Turns:** "Now playing: NAME" goes through the page's single live region. Start turn shows the board and focuses its first card. When a game ends, Next turn or Next match appears. When the final is decided, the screen heading becomes "Champion: NAME" with Back to game.
- **Leave tournament:** opens a native dialog with Keep playing and Leave. Keep playing has focus, and Escape keeps playing.
- **Bracket:** a table captioned "Bracket", one row per player per match, the winner marked "(winner)", and later rounds shown as "Winner of Semifinal 1".
- **Solo records untouched:** tournament games never change the saved size or best scores. A test checks the stored preferences before and after a whole tournament.
- **Past tournaments:** finished ones are saved under `np3:tournaments`, newest 10, and survive reload. If storage is blocked, the list shows "Progress won't be saved on this device." Corrupt saved data is treated as empty and only overwritten at the next save.
- **Export/Load:** on every Tournament screen, using a Tournament JSON box. The format is `neon-pairs/tournament` version 1 with alphabetical keys. An extra field gives "Unknown field: NAME."; other bad input gives "Invalid tournament." Either way the draft and the current tournament are kept.

**Changes outside the new folder**
- The turn logic in `session.ts` is split so tournament turns run without saved preferences (new `src/game/session/use-turn-game.ts`).
- The clock in `use-session-clock.ts` now pauses when the game isn't on screen.
- `GameStatus.tsx` can hide the Best figure, which tournament turns do.
- The board help text moved into a shared `BoardHelp.tsx`.
- `Game.tsx` owns the one live region for both screens and has a new "Solo game" heading.
- `tests/accessibility.e2e.test.ts` now expects one more Tab stop for the new button.

**Spec updates** (the project rules ask for these alongside code changes)
- New spec page `docs/competition/tournament.md`, listed in its folder index and the docs map.
- `rules.md` (pause conditions), `controls.md` (new requirement C15), `source-layout.md` and the root `README.md`.
- One-sentence fixes to the competition and policy pages that said these features didn't exist.

**Decisions for you to confirm**
- I wrote these messages myself: "Invalid tournament.", "Loaded tournament.", "There is no tournament to export.", the leave dialog text, "No finished tournaments yet." and the "Solo game" heading.
- Loading an already-finished tournament doesn't add it to Past tournaments; only tournaments finished on this device do.
- The champion screen appears as soon as the final is decided, with no Next match step.
- The turn clock keeps running while the leave dialog is open.
- I didn't change the spec version number (still 2.2).

**Things to know**
- `npm run format:check` already failed before my changes: 214 docs files aren't Prettier-formatted. Every code and test file I touched passes.
- Tests ran on Node 22.23 with Chrome for Testing 153, not the project's named setup, so the tested-versions record in the README is unchanged.
- Nothing was saved to `.agents` memory; the choices above aren't settled yet.

