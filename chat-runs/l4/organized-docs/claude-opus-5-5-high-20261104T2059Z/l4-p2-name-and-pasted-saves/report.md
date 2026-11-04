Both changes are done: you can now name a game before you save it, and the name comes back when you load the save. Saves that you paste in now open even when their fields are in a different order. I ran the type check, the unit tests (146) and the full browser suite (79 journeys, including 2 new ones) on Node 24.22.1 and npm 11.19.1 with Playwright 1.64.1 and Chromium 156.0.8078.4, and they all pass. I didn't run them on the project's named combination (Node 26.12.1 / npm 11.20.0), because that Node version isn't installed here. `npm run format:check` was already failing before I started, on all ten `docs/` files and three existing test files; my files pass it, and I left those files alone. Nothing is committed.

**Why pasted saves wouldn't open.** In `src/game/snapshot.ts`, the loader required `"version"` to be the first field in the JSON. Your own exports always put it first, so they worked. A save that went through another tool or editor that reorders or sorts the fields was rejected, even though the spec says nothing about field order. The loader now accepts the fields in any order but still requires exactly the right set of them. Tests cover sorted and reversed field order for both save versions, and a browser journey loads a reversed save that is indented differently.

**Deal name**, following `docs/controls.md` C15 and `docs/reproducibility.md` D05:
- **The field:** a "Deal name" text box inside "Reproduce a game". It starts empty and allows up to 40 characters on one line. Spaces around the name are kept exactly as typed, and clearing the box makes the game unnamed. You can rename while the game is paused or finished, and renaming doesn't change the board, moves, clock or pause.
- **Saving:** a named game exports as a version 2 snapshot that includes the name, and an unnamed game still exports version 1.
- **Loading:** a version 2 save brings back its name with the usual pause and Resume. A finished named save stays still and doesn't change your best score. Loading a version 1 save clears the name.
- **When the name clears:** New Game, Restart, changing the grid size, Load board and reloading the page. Names are never stored in the browser's saved preferences.
- **Replay:** the command-line tool still prints unnamed version 1 snapshots.

**What changed:**
- New files:
  - `src/game/deal-name.ts`: the name rules.
  - `src/game/controls/DealNameField.tsx` and `src/game/controls/deal-name.css`: the field and its styling.
  - `src/game/named-snapshot.test.ts` and `tests/deal-name.e2e.test.ts`: the new tests.
- Changed:
  - `src/game/snapshot.ts`: the two save versions and the field-order fix.
  - `src/game/game.ts`: game state now carries a `name`, empty when unnamed.
  - `src/game/session/session.ts` and `use-game.ts`: renaming.
  - `src/game/controls/Reproduction.tsx`, `control-labels.ts` and `src/game/Game.tsx`: wiring and the label.
  - `src/game/game.fixture.ts`: the expected values from the spec.
  - `src/game/session/session.test.ts`: a new renaming test.
- `README.md`: the status now says it implements spec version 3, the Play section describes deal names, and the test record says what ran for this version, including that the named combination wasn't rerun.

To run the tests I installed the locked dependencies and Playwright's Chromium into the project folders that git already ignores (`node_modules`, `.npm-cache`, `.playwright-browsers`).
