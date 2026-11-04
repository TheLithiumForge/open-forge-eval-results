Both changes are in: you can now name a game before saving it, and the name comes back when you load that save. Saves you paste now open even when their fields are in a different order from my exports. All checks pass: type check, 146 unit tests and 79 browser tests. Nothing is committed.

I followed the project rules. The `open-forge` CLI isn't installed, so I read the loader, its required catalogues and `docs/README.md` with its linked specs by hand. The specs already define both behaviours (Controls C15, Reproducibility D05/D06), so I changed no spec files.

**Why pasted saves failed**
The import code required `version` to be the first field. The spec doesn't require any field order. So a save whose fields had been reordered, for example sorted alphabetically by another tool, was rejected. I checked this against the original code: the same save with sorted fields was rejected, and with `version` first it loaded. Import now checks only that each field is present exactly once, in any order. All the other validation is unchanged.

**Deal names**
- **Field:** a "Deal name" text input in the "Reproduce a game" panel. It starts empty and allows up to 40 characters (counted as UTF-16 code units). Line breaks are rejected; spaces and all other characters are kept as typed. Editing it leaves cards, moves, the clock and any pause unchanged, including while paused or after a win.
- **Export:** a named game exports as version 2 with a `name` field. An unnamed game still exports as version 1, and the replay command still outputs version 1.
- **Import:**
  - A named save restores its name, and an unfinished one loads paused until you select Resume.
  - A completed named save keeps the static win banner and doesn't change the best score.
  - A version 1 save clears the name.
  - Version 2 without a valid name, a name in a version 1 save, or any other version is rejected.
- **Clearing:** New Game, Restart, changing size, loading a board code and reloading the page all clear the name. Names aren't stored in browser preferences.

**Files**
- New: `src/game/deal-name.ts` holds the 40-character limit and the name check.
- `src/game/game.ts`: game state has a `name` field, empty for an unnamed game.
- `src/game/snapshot.ts`: the version 2 format and the field-order fix.
- `src/game/session/session.ts` and `src/game/session/use-game.ts`: renaming the game.
- UI: `src/game/controls/Reproduction.tsx`, `src/game/controls/control-labels.ts`, `src/game/controls/reproduction.css` and `src/game/Game.tsx`.
- New tests: `src/game/named-snapshot.test.ts` and `tests/deal-name.e2e.test.ts`. I also added a rename test to `src/game/session/session.test.ts`.
- I updated `README.md`: status is now spec version 3, with the new behaviour and an accurate test record.

**Before you rely on the test record**
- This machine has Node 22.23.4 and npm 10.9.9, which is below the project's minimum of Node 24.19. I installed Playwright's Chromium 156.0.8078.4 into `.playwright-browsers/`, which git ignores. The README now says these spec version 3 changes have no record on the project's reference Node/npm/Playwright versions yet. That run is still needed.
- The formatting check already reported 23 files before I started, mostly under `docs/` and `.agents/`. I left them alone; every file I changed passes it.

Nothing needed saving to the project's notes folder (`.agents/memory`).
