# Tournament

Tournament is local knockout play for four or eight people sharing one device. Open it with Tournament beside New Game. Choose Players, fill the inputs labelled Player 1 through the selected count, then select Start tournament.

Accepted names trim surrounding whitespace, collapse internal whitespace and normalize to NFC. Each name has 2–20 Unicode code points. Invalid lengths block starting with "Use 2 to 20 characters." Names compare case-insensitively within this tournament; repeats block starting with "Each name must be different." Drafts stay editable after rejection.

## Bracket and play

Entry order assigns seeds, with seed 1 highest. Four entrants open as 1–4, 2–3. Eight open as 1–8, 4–5, 3–6, 2–7. Adjacent match winners meet in the next round. Quarterfinal uses 4x4, Semifinal 6x6 and Final 8x8; four entrants begin at Semifinal. Show "Round: NAME" and "Now playing: NAME" during play and handoffs.

Every match has a distinct full board code. Both players play that code in bracket order, each starting with an empty board, zero moves and zero elapsed time. Start turn begins each player's attempt; active time starts at the first reveal under the ordinary game rules. After the first finish, Next turn leads to the second player's Start turn. After the second finish, Next match leads to the next match's Start turn. The last finish shows "Champion: NAME" and Back to game.

Fewer moves wins. Equal moves compare precise active elapsed milliseconds; exact equality goes to the higher entry seed. Display time with the ordinary m:ss formatter. The bracket is a native table with a caption and column headers for Match, Round, Player, Moves, Time and Winner. Each winning player name has a literal "(winner)" suffix. Unplayed results and undecided opponents remain marked as such.

Tournament games never update the solo saved size or best scores. They reuse the game engine, board navigation, visibility handling and monotonic session clock. Waiting for Start turn or a handoff does not run a game clock. Leaving unmounts the active turn and clears its pending clock work.

## Navigation and feedback

Leave tournament ends an unfinished event early. Leaving entered setup names or replacing unfinished work with a valid load also asks first. Opening Tournament from a started, unfinished solo game asks first. The native dialog has Keep playing and Leave; Keep playing receives initial focus and Escape keeps playing. Cancellation preserves progress and returns focus to the trigger. The existing solo New Game, Restart and reproduction actions keep their existing behavior.

Each screen replacement focuses its h2 with tabindex="-1". Initial solo loading remains quiet. Event text and game results use the single polite, atomic status region declared in Game.tsx. Clock renders and focus changes do not republish results. New controls have at least 44x44 CSS pixel targets at 390px width. Tables scroll within their own region when needed.

## Export and load

Every tournament screen includes Export tournament, Tournament JSON and Load tournament. Export fills the editable box with readable JSON for manual copying, including setup drafts, completed match results and an active game's snapshot when present. Export synchronizes the active clock and continues play. Load validates the complete draft before replacing anything. A failed load preserves the current event and draft, publishes "Invalid tournament." or "Unknown field: NAME." for the first unknown key, and leaves focus at the load action.

The version 1 tournament object has exactly these keys, in alphabetical order on export at every object level:

| Key          | Value                                                 |
| ------------ | ----------------------------------------------------- |
| `format`     | `"neon-pairs/tournament"`                             |
| `game`       | A version 1 snapshot while playing; otherwise `null`  |
| `matchIndex` | Zero-based current match index                        |
| `matches`    | Bracket-order array of `{boardCode, results}` records |
| `names`      | Four or eight names in entry order                    |
| `phase`      | `setup`, `ready`, `playing`, `result` or `complete`   |
| `version`    | `1`                                                   |

A result has exactly `elapsedMs` and `moves`. It belongs to the corresponding match player's position. Moves are safe integers from the stage's pair count through 999999. Time is a finite number from zero through 359999999, preserving fractional milliseconds for comparison. Snapshot values retain the existing snapshot rounding rules. Winners and future participants are derived rather than imported as independently editable fields.

Setup has no matches, matchIndex zero and no game; its names remain drafts. Started events require normalized valid distinct names, one unique correctly sized deal per match, and sequential results. Earlier matches have two results, later matches have none. Ready and playing have zero or one current result; result has one or two. Complete requires two results in every match and the last match index. Only playing has a game, which must be unfinished and use the current match code. All nested objects reject unknown keys. The text boundary accepts at most 262144 UTF-8 bytes.

Loaded active progress waits for Start turn before resuming its saved game and mismatch interval. Other phases restore their handoff, setup or champion view. Successful load publishes feedback through the existing status region.

## Saved tournaments

Completed tournaments are saved under `np3:tournaments` as exactly `{ "v": 3, "items": [...] }`, with each item using the tournament object above. New completions appear first; saving keeps the newest ten and removes an identical existing record. Past tournaments on the setup screen opens their bracket and export controls after reload. Active and abandoned events are not automatically saved.

Unreadable or invalid stored data is treated as empty without a notice or mutation until the next save. Storage access, read and write failures leave play and completed records available in memory. Show "Progress won't be saved on this device." beside Past tournaments when storage is blocked. In-memory history survives navigation back to solo play during the current visit. Unrelated storage keys retain their values.

## Implementation and checks

`src/game/tournament/rules.ts` owns pure pairing, stages, name processing, comparisons and handoffs. Adjacent format validation, storage and React components own their respective boundaries. `useGame` can run an isolated tournament game without a preference store; its activation path skips solo best-score updates. Browser time observations remain in `src/game/session`.

Adjacent unit tests cover both brackets, name boundaries, handoffs, comparisons, formats and storage. The tournament browser journeys exercise complete four- and eight-player events using the independent deal oracle, shared codes, persistence, solo preference isolation, screen focus, leave/load confirmation, active restoration, storage denial and phone controls. Browser accessibility evidence does not establish spoken screen-reader output; spoken review remains user acceptance.
