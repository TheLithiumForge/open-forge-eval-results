---
open-forge:
  description: Tournament screens, handoffs, persistence and version 1 JSON exchange
  tags: [Competition, Controls, Formats, Persistence]
---

# Tournament mode

Tournament mode runs a knockout for four or eight people sharing one device. Open it with Tournament beside New Game. Choose Players, enter Player 1 through Player 4 or Player 8, then select Start tournament. Accepted names follow the [text entry](../interface/text-entry-policy.md), [length](../interface/name-length-policy.md) and [duplicate name](../interface/duplicate-names-policy.md) policies.

## Play and results

Entry order defines seeds and the opening matches in [Competition pairing](competition-pairing.md). Adjacent winners advance. The [round names](competition-rounds.md), [board dimensions](competition-boards.md), [unique match deals](competition-deals.md) and [tie-break order](competition-ties.md) apply throughout.

Each match's players play the same board code independently from its hidden starting state. Now playing: NAME identifies the current player in the one live region in `Game.tsx`. Start turn opens that player's board; active time starts at the first valid reveal. A completed first attempt offers Next turn. A completed match offers Next match. Both actions lead to another Start turn gate. Waiting at a gate consumes no active time.

The bracket is a table with a caption and column headers. It shows every match, its round, both players, moves, time and winner. Future participants and winners appear as To be decided. Result time displays as minutes and seconds; the cell title and exported result retain milliseconds. Comparison uses the exact captured active milliseconds, including fractions.

The final result shows Champion: NAME and Back to game. Leave tournament stops an unfinished event after the native [leave confirmation](../interface/dialog-policy.md). Opening Tournament from an unfinished solo game also confirms first. Keep playing and Escape preserve play; Keep playing initially receives focus. Replacing a screen focuses its h2 with `tabindex="-1"`. Departure invalidates earlier timer callbacks.

Tournament games preserve solo best scores and the saved board size. Returning starts a fresh solo game at the saved size. Card rules, keyboard navigation, hidden identity, visibility pauses and silence use the existing game implementation.

## Saved tournaments

Completed events, including completed imports, appear in Past tournaments on the setup screen after reload. View tournament opens their results and exchange tools. Reimporting the same event moves its existing record to the front rather than duplicating it.

The storage key is `np3:tournaments`. Its value has exactly `v: 3` and `items`, an array of completed tournament records in newest-save-first order. Saving retains the newest ten. A record contains exactly `matches` and `players`. Reads validate the whole collection; corrupt data is treated as empty and is left untouched until a later save. Only finished events are saved automatically. Unfinished progress can be exported explicitly.

Acquisition, read and write failures leave the feature usable in memory. The Past tournaments area shows "Progress won't be saved on this device." after a failed storage operation. Other keys, including the existing preference key, retain their own formats.

## Tournament JSON, version 1

Every Tournament screen contains Export tournament, a Tournament JSON textarea, and Load tournament. Export fills the box with readable JSON whose object keys are alphabetical at every level. It synchronizes active game time without pausing or replacing the game. Load validates the whole draft before replacement and preserves both the draft and current event on failure. Unknown fields report `Unknown field: NAME.`; other failures identify the invalid tournament part. Replacing an unfinished event asks for the same leave confirmation.

The top-level object has exactly these keys:

| Key       | Value                                                                               |
| --------- | ----------------------------------------------------------------------------------- |
| `format`  | `"neon-pairs/tournament"`                                                           |
| `run`     | `null` for setup, otherwise the run object below                                    |
| `setup`   | Exactly `count` (4 or 8) and `names` (eight string drafts, including hidden fields) |
| `version` | `1`                                                                                 |

A run has exactly `event`, `game`, `matchIndex` and `phase`:

- `event` has exactly `matches` and `players`. Players are four or eight names in seed order, normalized before length and duplicate checks. Matches contains exactly one fewer entry than players, in round order. Each match has exactly `boardCode` and `results`. Its code is valid, has the required round size and differs from every other match code.
- `results` contains zero, one or two attempt results in player order. Each result has exactly `elapsedMs` and `moves`. Moves is an integer from the board's pair count through 999999. Elapsed milliseconds is finite, nonnegative and at most 359999999; fractions are retained. Participants and winners are derived from the bracket and results.
- `matchIndex` is the zero-based current match. Earlier matches must have two results; later matches must have none.
- `phase` is `ready`, `playing`, `turn-result`, `match-result` or `complete`. Ready and playing have zero or one results; turn-result has one; match-result has two and precedes the final; complete has two at the final.
- `game` is `null` except during playing or an imported ready gate. A non-null game uses the existing [version 1 snapshot](../sharing/reproducibility.md#snapshot), with all its validation and rounding. It must be unfinished and use the current match code. Playing requires a game. Loading playing converts it to ready and preserves progress; Start turn resumes it. Handoff waiting never spends its saved mismatch remainder or elapsed time.

Input is limited to 65536 UTF-8 bytes. No imported object bypasses name, deal, result, progression or snapshot validation. Valid results describe consistent local data rather than verified performance.

## Source and evidence

Pure bracket, normalization and comparison behavior lives in `src/game/tournament/rules.ts`, with format and storage validation beside it. `session/use-tournament.ts` coordinates handoffs and import/export; `session/use-tournament-history.ts` owns saved-record effects. The session clock remains the only observation source, and fresh-board remains the only entropy source. Components under `tournament/` render forms, the bracket, exchange controls and the native dialog.

Adjacent unit tests cover pairing, advancement, exact tie-breaks, name boundaries, preference isolation, JSON validation and storage retention/failure. `tests/tournament.e2e.test.ts` and `tests/tournament-import.e2e.test.ts` cover the built UI, complete brackets, reloads, import continuation, leave/cancel focus, phone targets and offline use. Browser runtime evidence is recorded by the existing harness. Spoken screen-reader output remains user acceptance.
