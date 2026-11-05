Tournament mode is in and working in the project folder. `npm run typecheck` and `npm test` pass (26 files, 177 tests). `npm run test:e2e` passes 84 of 84 (77 existing plus 7 new). The e2e run used the sandbox's Chromium 1243 through `PLAYWRIGHT_CHROMIUM_EXECUTABLE`, not the README's named combination, and under Node 22 rather than Node 24+/26, so none of it counts as named-combination evidence. Nothing is committed, and I started no dev servers.

## What you get
- **Opening it:** a "Tournament" button sits right after New Game and replaces the main area with the Tournament screen. Focus lands on its `h2`.
- **Setup:** a Players select (4 or 8), inputs labelled "Player 1" to "Player N", and "Start tournament".
- **Play:** "Now playing: NAME", "Start turn", "Next turn", "Next match" and "Leave tournament" work as you described. The board is not drawn before Start turn and is removed on Next turn / Next match, so the second player never sees the deal.
- **Results:** the bracket is a table with a caption, `th scope="col"` headers, one row per player per match, plus moves, time and winner. The final shows "Champion: NAME" and "Back to game".
- **Records:** finished tournaments go into "Past tournaments" on the setup screen and survive reload.
- **Exchange:** "Tournament JSON" box with "Export tournament" and "Load tournament" on every screen, including setup.

## Project rules followed that you did not spell out
- **Pairing and rounds:** seeds follow entry order. Four players meet 1v4 then 2v3. Eight meet 1v8, 4v5, 3v6, 2v7. Rounds are Quarterfinal on 4x4, Semifinal on 6x6, Final on 8x8, shown as "Round: NAME". Four players have no quarterfinal.
- **Deals:** both players of a match play one board code, and every match in a tournament gets a different full code. All codes are chosen at start, using only the existing fresh-code helper.
- **Tie-breaks:** fewer moves win, then lower active time, then the higher seed. Time is compared as whole milliseconds recorded when the game ends, never from displayed text.
- **Preferences:** tournament games run in their own session. The saved size and best scores are never touched, and the e2e test checks the stored preferences are byte-identical afterwards.
- **Names:** trimmed, inner whitespace collapsed, NFC. Length is 2 to 20 code points, giving "Use 2 to 20 characters." Case-insensitive repeats give "Each name must be different." The inputs have no `maxlength`, so the check sees what was typed.
- **Leave:** "Leave tournament" opens a native dialog with "Keep playing" and "Leave". Keep playing takes focus and Escape keeps playing.
- **Live region:** there is still exactly one, in `Game.tsx`. "Now playing", name and load errors, turn results and match verdicts go through it. The Tournament screen adds no second one.
- **Storage:** the past list is stored under `np3:tournaments` as `{"v":3,"items":[...]}` and keeps the newest 10. A value that cannot be read counts as empty and is left alone. A blocked store shows "Progress won't be saved on this device." by the past list.
- **Export format:** the document has `format: "neon-pairs/tournament"` and a whole-number `version`, with keys alphabetical at every level. A field the format does not define gives "Unknown field: NAME." Other problems give "Invalid tournament." Load checks the whole text first and keeps the current state on failure.
- **Layout:** every new control is at least 44px at a 390px viewport with no sideways scroll, and the e2e suite checks it.
- **Code placement:** rules are in `src/game/tournament/rules.ts` with tests beside it. No new dependencies, all TypeScript files are 200 lines or fewer, and the source audits pass.

## Choices to review
- **Existing test changed.** Adding a button to the deal bar changes the Tab count in the accessibility journey, so I updated `tests/accessibility.e2e.test.ts`: 3 Tabs from New Game to the board, 4 Shift+Tabs back.
- **Leave returns to setup.** "Leave tournament" goes back to the setup screen, not to the game. "Back to game" also exists on the setup screen.
- **Past list is setup-only.** "Past tournaments" shows on the setup screen only, so the finished screen has a single table.
- **Setup export is a draft.** Export on setup writes a "draft" document with no matches. Loading it fills the form, and its names are still validated at Start.
- **Loaded tournaments are not saved.** A loaded tournament is untrusted, so loading one never adds it to the past list.
- **Game clock keeps running.** The solo game stays in memory while the Tournament screen is open, and its clock keeps running because nothing in the spec pauses it. Say if you want that changed.
- **Docs, no version bump.** I added `docs/competition/tournament.md` (K01 to K20) and updated the README map, controls (C15), acceptance, source layout, persistence overview and the competition, dialog, focus, tables, name and announcement pages that said these features did not exist. I did not bump the spec version.
- **Formatting.** `prettier --check` still fails on many existing docs that I did not touch; everything I added or edited in `src`, `tests`, `README.md` and `tournament.md` passes.

Main files: `src/game/tournament/` (rules, names, format, storage, deals, flow, controller and the screen components), `src/game/Game.tsx`, `src/game/controls/Controls.tsx`, `tests/tournament*.ts`.
