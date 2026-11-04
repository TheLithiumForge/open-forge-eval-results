Both changes are in. You can name a game before saving it, and pasted saves that wouldn't open now load. The type check, 159 unit tests and all 79 browser journeys pass. That run wasn't on the project's named Node 26 / Chromium 156 setup, and Node 22 is below the project's minimum, so that run is still owed. Nothing is committed.

**Why pasted saves failed:** snapshot import rejected any save whose first key wasn't `version`. The app's own exports always put it first, so they worked. A save that had been hand-edited or produced elsewhere could list the same fields in another order, and it was turned down as "Invalid snapshot." The spec doesn't require any key order. Import now checks that the save has exactly the right set of keys, in any order. Line endings and surrounding whitespace from pasting were already fine and still are. Everything else is still rejected as before, including unknown or missing keys, other versions and the size limit.

**Deal names (spec version 3, rule C15):**
- There's a new "Deal name" text box inside "Reproduce a game". It starts empty and takes up to 40 characters. Line breaks are rejected, and spaces and other characters are kept exactly as typed.
- Changing the name doesn't touch the board, moves, clock or pause, and it works while paused or after a win. Clearing the box makes the game unnamed.
- A named game exports as a version 2 snapshot with a `name` field. An unnamed game still exports as version 1, and the replay command still outputs version 1.
- Loading a version 2 save brings its name back with the usual pause and Resume. Loading a version 1 save clears the name.
- New Game, Restart, changing the grid size, loading a board code and reloading the page all clear the name. Names aren't stored in browser preferences.

The name is kept in the game state, so starting any new deal leaves it empty automatically.

**Files:**
- Core changes:
  - `/home/user/eval-run/l4-p2-name-and-pasted-saves/project/src/game/deal-name.ts` (new)
  - `/home/user/eval-run/l4-p2-name-and-pasted-saves/project/src/game/snapshot.ts`
  - `/home/user/eval-run/l4-p2-name-and-pasted-saves/project/src/game/game.ts`
- Screen and session wiring:
  - `/home/user/eval-run/l4-p2-name-and-pasted-saves/project/src/game/session/use-game.ts`
  - `/home/user/eval-run/l4-p2-name-and-pasted-saves/project/src/game/controls/Reproduction.tsx`
  - `/home/user/eval-run/l4-p2-name-and-pasted-saves/project/src/game/controls/control-labels.ts`
  - `/home/user/eval-run/l4-p2-name-and-pasted-saves/project/src/game/controls/reproduction.css`
  - `/home/user/eval-run/l4-p2-name-and-pasted-saves/project/src/game/Game.tsx`
- Tests:
  - `/home/user/eval-run/l4-p2-name-and-pasted-saves/project/src/game/deal-name.test.ts` (new)
  - `/home/user/eval-run/l4-p2-name-and-pasted-saves/project/src/game/named-snapshot.test.ts` (new; covers reordered keys and Windows line endings)
  - `/home/user/eval-run/l4-p2-name-and-pasted-saves/project/tests/deal-name.e2e.test.ts` (new)
  - `/home/user/eval-run/l4-p2-name-and-pasted-saves/project/src/game/game.fixture.ts` (added the spec values for version 2 and the 40-character limit)
- `/home/user/eval-run/l4-p2-name-and-pasted-saves/project/README.md`: status changed to spec version 3, deal names described, and the test record updated.

**Test runs:**
- **Environment:** this machine has Node 22.23.4, npm 10.9.9, Playwright 1.64.1 and Chromium 153.0.8010.12.
- **Browser setup:** the locked Playwright expects a Chromium build that isn't installed here. I pointed the tests at the installed one with `PLAYWRIGHT_CHROMIUM_EXECUTABLE`, and the named-setup check was off.
- **Results:** `npm ci`, the type check, `npm test` and the full `npm run test:e2e` all passed.
- **README record:** I changed the README to say the spec version 3 changes haven't been run on the named setup yet, and recorded the versions above. It no longer claims the current code passed on the named setup.
- **Still to do:** run `NEON_PAIRS_NAMED_COMBINATION=1 npm run test:e2e` on Node 26.12.1 / npm 11.20.0 / Chromium 156.0.8078.4 and update that README line.

`npm run format:check` already failed before my changes, on all of `docs/` plus `scripts/replay.test.ts`, `tests/accessibility.e2e.test.ts` and `tests/layout.e2e.test.ts`. I left those files alone. Every file I changed or added passes Prettier.
