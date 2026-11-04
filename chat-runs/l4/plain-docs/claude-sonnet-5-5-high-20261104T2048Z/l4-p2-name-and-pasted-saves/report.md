Both changes are in. You can now name a game before saving it, and pasted saves load whatever order their fields are in. Type check, the 145 unit tests and all 79 browser tests pass, including two new browser tests. I ran the browser tests against the installed Chromium 1243 via `PLAYWRIGHT_CHROMIUM_EXECUTABLE`, so there's no named-combination (`NEON_PAIRS_NAMED_COMBINATION`) record for this run. I didn't commit anything.

**Naming a game (C15, D05)**
- **Deal name input:** the "Deal name" input is inside "Reproduce a game" and starts empty. It is limited to 40 UTF-16 code units and rejects line breaks. Spaces and other characters are kept as typed.
- **Editing:** changing the name doesn't touch the cards, moves, clock or pause, and it works while paused or completed. Clearing the field makes the game unnamed.
- **Export and load:** a named game exports as version 2 with `name` right after `version`. An unnamed game still exports as version 1 with no `name`. Loading a version 2 save restores the name and keeps the usual pause and Resume behaviour. Loading a version 1 save clears it.
- **Clearing:** New Game, Restart, a size change and a board-code load all clear the name. Names aren't saved in preferences, so a reload starts unnamed.
- **Validation:** a version 2 save is rejected if its name is missing, empty, over 40 units or contains a line break. Any other version is still rejected.

**Pasted saves that wouldn't open**
- **Cause:** the import check required `version` to be the first field. Your own exports always put it first, but pasted JSON with the fields in another order was rejected.
- **Fix:** each version now just needs exactly its own set of fields, in any order. Extra or missing fields are still rejected, and all the other save checks are unchanged.

**Tests**
- New unit tests in `src/game/named-snapshot.test.ts` cover version 2 export and import, the name rules, version 1 loading unnamed, and loading with reordered fields.
- New browser tests in `tests/deal-name.e2e.test.ts` cover export, reload and the cleared name after Restart, plus pasting a reordered, pretty-printed save.
- Prettier flags several files that were already unformatted before my edits. I formatted only the ones I touched.

The core change is in `src/game/snapshot.ts`, with the name rules in the new `src/game/deal-name.ts`. The input is in `src/game/controls/Reproduction.tsx` and the editing hook is in `src/game/session/use-game.ts`.
