# Tournament mode

Tournament mode runs a four- or eight-player knockout on one device. Tournament beside New Game opens the setup screen. Players selects the group size; Player 1 through Player 8 collect names. Start tournament accepts the normalized, distinct names under the text-entry, name-length and duplicate-name policies.

Entry order supplies seeds. Four players open with 1–4 and 2–3; eight open with 1–8, 4–5, 3–6 and 2–7. Adjacent match winners meet in the next stage. Quarterfinal boards are 4x4, semifinal boards 6x6 and the final 8x8. Each match receives a distinct board code; its two players start from the same hidden deal. The bracket table shows players, moves, M:SS time and the winner, including the text `(winner)`.

The screen shows `Round: NAME` and `Now playing: NAME`. Start turn opens that player's board. Time starts at the first reveal and uses the existing active session clock, including hidden-page pauses and fractional milliseconds. A completed first attempt offers Next turn, followed by Start turn for the opponent. A completed match offers Next match. Moves decide the winner, then exact active milliseconds, then the higher entry seed (seed 1 is highest). The final displays `Champion: NAME` and Back to game.

Leave tournament and replacement of an unfinished tournament use a native dialog with Keep playing and Leave. Keep playing initially has focus; Escape continues. Opening Tournament from unfinished solo play also asks first. Screen replacements focus their h2 with tabindex -1. Tournament announcements use the single status region in Game.tsx. Tournament play never updates solo best moves or the preferred board size.

## Saved history

Completed tournaments appear in Past tournaments, newest saved first, and can be viewed again. The key is `np3:tournaments`; its value has exactly `v: 3` and `items`, an array of completed tournament documents. A save retains the newest ten distinct records. Reading corrupt data silently returns an empty list and leaves its string untouched until another completed tournament is saved. Denied reads or writes keep the list in memory and show `Progress won't be saved on this device.` beside Past tournaments. Incomplete tournaments remain in memory and are preserved across visits through explicit JSON export.

## Tournament JSON

Every tournament screen includes Export tournament, Tournament JSON and Load tournament. Export synchronizes an active game before writing readable JSON. The outer object has exactly these fields, alphabetically ordered along with all nested object keys:

```json
{
  "format": "neon-pairs/tournament",
  "tournament": null,
  "version": 1
}
```

Null represents the setup screen. Otherwise `tournament` has `currentMatch`, `game`, `matches`, `phase` and `players`. Players is the entry-order name array. Matches contains `boardCode` and `results`; each result has `elapsedMs` and `moves`. The current match is a zero-based index. Phase is `ready`, `playing`, `turn-result`, `match-result` or `complete`. Game is null between attempts, or an existing version 1 snapshot object. Snapshot rounding applies to game progress; completed result times retain fractional precision.

Load checks the entire document before replacement: exact keys, version, names, seeded bracket shape, stage dimensions, distinct deals, bounded scores, completed earlier matches, empty later matches and phase/game/result consistency. An unknown key reports `Unknown field: NAME.` Other failures report `Invalid tournament.` The one-MiB UTF-8 limit also applies outside the textarea. Failed loads preserve the draft, current game and focus. Loading active progress waits for Start turn, so inspecting or passing the device does not spend active time. Loading a completed tournament adds it to local history; importing the same document does not duplicate it.

## Implementation and evidence

`src/game/tournament/rules.ts` owns the pure bracket transitions. Format validation and storage adapters are beside it. `src/game/session/use-tournament-game.ts` reuses the existing session clock and activation feedback with solo score recording disabled. Browser randomness still lives exclusively in `fresh-board.ts`.

The adjacent rule, format and storage tests cover pairings, Unicode names, ordered ties, handoffs, malformed data, retention and storage failures. `tests/tournament.e2e.test.ts` exercises complete four- and eight-player brackets, history reload, solo-score isolation, JSON restoration, native confirmation and phone control targets against the built HTML.
