# Tournament mode

Tournament mode extends solo play with a local knockout for four or eight people sharing one device. Its pure rules live in `src/game/tournament/rules.ts`; the screen, turn adapter, exchange decoder and history storage live beside them. It reuses the existing Board, GameStatus and session clock without writing solo preferences.

## Setup and play

Tournament appears beside New Game and replaces the main screen. Players selects 4 or 8. The visible text inputs are labelled Player 1 through Player 4 or Player 8. Start tournament validates the whole group before accepting it. Names follow the [representation](../interface/text-entry-policy.md), [length](../interface/name-length-policy.md) and [duplicate](../interface/duplicate-names-policy.md) policies.

Entry order supplies seeds. Four entrants meet as 1–4 and 2–3. Eight meet as 1–8, 4–5, 3–6 and 2–7. Adjacent match winners meet in the following round. The stage is displayed as Round: Quarterfinal, Round: Semifinal or Round: Final. Boards are 4x4, 6x6 and 8x8 respectively.

Every match has a distinct full board code, selected through the existing fresh-board boundary. Both players receive that match's identical initial hidden deal, one after the other. Now playing: NAME identifies the player. Start turn begins their game; elapsed time starts on their first reveal under the existing active-time rules. Waiting between attempts does not count.

After the first finish, Next turn prepares the opponent's game. After the second, Next match prepares the following match. Results compare moves, then full active milliseconds, then the original entry seed; seed 1 wins an exact tie. The final finish displays Champion: NAME and Back to game. The bracket is a captioned table with column headers for Match, Player, Moves, Time and Winner; future opponents and unfinished results remain visibly pending.

Leave tournament ends unfinished play after a native dialog offers Keep playing and Leave. Keep playing receives initial focus; Escape cancels. Replacing unfinished tournaments through import or history uses that same confirmation. Screen replacements focus the screen's h2 with tabindex -1. Turn and load messages use the one live region in Game.tsx. New controls meet the 44px target policy.

## History

Finished and imported complete tournaments enter Past tournaments, newest first. Identical exported records are deduplicated. Saving retains ten records under `np3:tournaments`, with exactly `{ "v": 3, "items": [...] }` as the outer value. Each item is a complete tournament export. Active tournaments and setup drafts remain in memory until explicitly exported.

Read failures and corrupt records produce an empty list; reads do not change stored text. A failed storage operation keeps in-memory play and history available and shows Progress won't be saved on this device. A successful later save replaces the stored list. Solo preferences retain their existing key and format.

## JSON exchange version 1

Every tournament screen includes Export tournament, Load tournament and the Tournament JSON textarea. Export synchronizes an active game's clock without pausing play. It emits readable JSON with alphabetical keys at every object level:

```json
{
  "format": "neon-pairs/tournament",
  "state": {
    "kind": "setup",
    "names": ["", "", "", ""]
  },
  "version": 1
}
```

Setup names are editable drafts, with exactly four or eight strings. Accepting the setup still requires valid normalized names. An active or complete state's exact keys are `deals`, `kind`, `names`, `phase`, `results` and `snapshot`:

- `kind` is `tournament`; `names` contains the four or eight accepted names in seed order.
- `deals` contains one distinct board code per match, in round order, with the required board size for each stage.
- `phase` is `ready`, `playing` or `finished`. Finished means the most recent attempt ended; the result count determines whether the event is complete.
- `results` is a prefix of completed attempts in match order, first player then second. Each has exactly `elapsedMs` and `moves`. Moves are integers from the stage's pair count through 999999. Elapsed time is finite, nonnegative and at most 359999999, retaining fractional precision for ties.
- `snapshot` is an existing version 1 snapshot object for the current attempt, or the last completed attempt when phase is finished. Its code, completion and counters must agree with the tournament. Snapshot milliseconds retain the existing whole-millisecond export rule.

Load accepts at most 131072 UTF-8 bytes and validates all fields, names, deals, scores and snapshot consistency before replacement. Unsupported versions, missing fields and inconsistent values show Invalid tournament. An unknown field at any declared object boundary shows Unknown field: NAME. Invalid input keeps the current game and JSON draft. Imported playing states enter ready and wait for Start turn before the clock or cards resume. Completed imports stay complete and never update solo records or celebrate a new played win.

## Verification

Adjacent rules, format and storage tests cover seeds, stage sizes, ties including fractional time, handoff progression, name boundaries, JSON validation, retention, corruption and denied storage. Browser journeys complete both bracket sizes from public controls with an independent deal oracle, reload and reopen history, check unchanged solo preferences, exercise import and confirmation, and measure new controls at a 390px viewport. Existing offline, clock, input, artwork and accessibility journeys remain part of the regression suite.
