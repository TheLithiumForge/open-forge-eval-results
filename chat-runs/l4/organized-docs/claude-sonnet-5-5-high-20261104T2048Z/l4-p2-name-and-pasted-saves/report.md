Both changes are in. You can now name a game, and the name comes back when you load your saved progress. Pasted saves that failed before now open. Unit tests (145), the type check and the build pass. In the browser suite, 78 of 79 journeys passed and my new pasted-save journey timed out. That was a mistake in the test itself, which I fixed, and the two new journeys now pass when run on their own. I did not re-run the whole browser suite after the fix.

**Why pasted saves failed.** The snapshot loader required `version` to be the first field in the pasted JSON. Your own exports always put it first, so they worked. A save from another tool, or one that was edited, failed with "Invalid snapshot." if the fields came in a different order. The loader now accepts the fields in any order. Extra, missing or unknown fields are still rejected.

**Naming a game** (follows spec version 3, C15 and D05):
- There is a "Deal name" text box inside "Reproduce a game". It holds at most 40 characters and drops line breaks, but keeps spaces and every other character.
- Editing the name changes nothing else: the cards, moves, clock and pause stay as they are. You can edit it while paused or after winning, and clearing it makes the game unnamed.
- A named game exports as a version 2 snapshot, and an unnamed one stays version 1. Loading a version 2 snapshot restores the name and still pauses an unfinished game until Resume.
- Loading a version 1 snapshot clears the name. A version 2 save with an empty, too-long or line-break name is rejected, and so is a version 1 save that contains a name.
- New Game, Restart, a size change and a board-code load all clear the name. Names are not saved in browser preferences, so a reload starts unnamed.

I added unit tests for the name rules, version handling and field order in `src/game/snapshot-name.test.ts`, and two browser journeys in `tests/deal-name.e2e.test.ts`. I also updated `README.md` to say it implements spec version 3 and to describe naming and field order. The main changes are in `src/game/snapshot.ts` and the new `src/game/deal-name.ts`.

`npm run format:check` reports style problems in 13 files, none of them mine: the files under `docs/`, `scripts/replay.test.ts`, `tests/accessibility.e2e.test.ts` and `tests/layout.e2e.test.ts`. My files pass. I left the others alone.

To run the browser tests here I installed the locked dependencies and downloaded Chromium into `.playwright-browsers`. That folder is git-ignored.
