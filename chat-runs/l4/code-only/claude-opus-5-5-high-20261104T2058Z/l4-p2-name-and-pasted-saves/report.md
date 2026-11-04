Both changes are done and the checks pass. You can now name a game before saving it, and the name comes back when you load that save. Saves that wouldn't open after pasting now load. Nothing is committed.

**Why pasted saves failed.** The loader required `version` to be the first key in the save. Your own exports always put it first, so they loaded. A save that had been through a JSON formatter or another tool usually has its keys in a different order, and it was rejected as "Invalid snapshot." even though nothing in it was wrong. The loader in `src/game/snapshot.ts` now accepts the fields in whatever order they come. Everything else is still checked the same way: each field must appear exactly once, no extra fields are allowed, and the version, size limit and game-state rules are unchanged.

**Naming a game.**
- There is a new "Game name" field in the Reproduce a game panel, above Snapshot JSON, limited to 60 characters.
- Export snapshot writes the name into the save, and Load snapshot puts it back in the field.
- New Game and Load board start a game with no name, and Restart keeps the current name.
- An unnamed export is exactly the same as before: there is no `name` field, the version stays 1, and the replay command's output is unchanged.
- A save with a name won't open in a copy of the game built before this change, because older builds reject any field they don't know.
- When loading, spaces around a name are trimmed and an empty name means unnamed. A name that isn't text, is over 60 characters or contains control characters such as a line break makes the save invalid.

The name rules are in the new file `src/game/game-name.ts`. The session keeps the name in `src/game/session/session.ts` and `use-game.ts`. The field is in `src/game/controls/Reproduction.tsx`, with its label in `control-labels.ts` and its style in `reproduction.css`, and `src/game/Game.tsx` connects them. I also added a line about naming and pasted saves to the README's play section.

**Project rules.** I followed the rules the project's own checks enforce: files of 200 lines or fewer, no forbidden words or type casts, every export used somewhere, test names without requirement IDs, and spacing values on the project's scale.

**Tests added.**
- `src/game/game-name.test.ts`: saving and loading a name, unnamed saves, fields in other orders, and invalid names.
- A test in `src/game/session/session.test.ts` for when the name is kept or cleared.
- A browser test in `tests/snapshots.e2e.test.ts` that names a game, exports it, starts a new game, loads the save back, and then loads it again with its fields reversed.

I also confirmed that the old loader rejected a save with its fields reordered.

**Check results.**
- `npm run typecheck` passes, and `npm test` passes all 147 tests.
- `npm run test:e2e` passes all 78 browser tests. This ran on Node 22.23.4 and npm 10.9.9 rather than the README's named versions (Playwright and Chromium did match), so it doesn't count as evidence for the named combination. To get it into the project folder, I downloaded Chromium 156.0.8078.4 to `.playwright-browsers/`, which git ignores.
- `npm run format:check` reports 3 files: `scripts/replay.test.ts`, `tests/accessibility.e2e.test.ts` and `tests/layout.e2e.test.ts`. They fail the same way without my changes, I didn't edit them, and every file I changed is formatted correctly.

The project is at `/home/user/eval-run/l4-p2-name-and-pasted-saves/project`.
