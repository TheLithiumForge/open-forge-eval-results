Both changes are in. Unit tests (148) and typecheck pass, and `npm run build` succeeds. I did not run the browser (e2e) tests because Chromium isn't installed in this sandbox, so the new "Deal name" field is untested in a real browser. I did not touch `docs/`, which already specifies the feature as spec version 3. No `open-forge` CLI was available, so I followed `.agents/loader.md` by hand. Directives, Crystallized and Working memory have no entries, and I read `docs/` (README, sharing, interface, technology, rules, acceptance).

**Pasted saves that wouldn't open**
- The cause was in `decodeSnapshot` (`src/game/snapshot.ts`), which required `version` to be the first key in the JSON. Your own exports always put it first, but pasted saves from other tools or hand edits often don't.
- The check is now order-insensitive. It accepts exactly the right set of fields, whatever order they appear in, and every other validation rule is unchanged.

**Naming a deal**
- **Field:** There is a "Deal name" text input inside "Reproduce a game" (labelled per C15.1). It is limited to 40 UTF-16 code units, rejects line breaks and keeps spaces as typed.
- **Export and load:** A named game exports as a version 2 snapshot with a `name` field, and an unnamed one stays version 1. Loading a version 2 snapshot restores the name. Loading a version 1 snapshot leaves the game unnamed. A version 2 snapshot with an empty, too-long, multi-line or non-string name is rejected.
- **Editing:** Editing the name doesn't touch the board, moves, clock, pause or announcements. It works while paused or after a win.
- **Clearing:** New Game, Restart, size changes and board-code loads clear the name. The name isn't saved in browser preferences, so a reload starts unnamed.
- **Other formats:** Replays and the replay CLI still produce unnamed version 1 snapshots.

**Code and tests**
- `src/game/deal-name.ts` is new and holds the name rules. `GameState` gains a `name` field, and `renameGame` in `src/game/session/session.ts` plus `rename` in `src/game/session/use-game.ts` handle edits. The field itself is in `src/game/controls/Reproduction.tsx`.
- I added `src/game/snapshot-name.test.ts` and two tests in `src/game/session/session.test.ts`. They cover the named round trip, field order, name validation and the clear/restore rules.
- `README.md` now says it implements spec version 3 and describes naming.

`npm run format:check` already reported style problems in 23 files, some in `docs/` and tests I didn't touch. The files I changed pass Prettier.
