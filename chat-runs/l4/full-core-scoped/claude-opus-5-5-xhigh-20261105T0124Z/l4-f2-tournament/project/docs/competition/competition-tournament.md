---
open-forge:
  description: The shipped Tournament mode, its screens, controls, results, exchange format
    and saved records, with the source files and tests that implement it.
  tags:
    - Competition
    - Interface
    - Specification
---
# Tournament mode

This page specifies the Tournament mode that four or eight people play on one device, and maps it to its source.

A knockout gives every match one deal. Both players play it, one after the other, and the fewer moves wins. The pairing, round, board, tie and score rules in the other competition pages apply unchanged; this page says how the game presents them.

## Screens and controls

- K01 - The deal bar shows a "Tournament" button between New Game and Restart. It replaces the solo screen with the Tournament screen. The solo game keeps its progress and its active time waits until Back to game or Leave returns to it.
- K02 - The setup has a "Players" select with options 4 and 8, inputs labelled "Player 1" to "Player 8" for the chosen count, "Start tournament" and "Back to game". Start tournament applies the [text entry](../interface/text-entry-policy.md), [name length](../interface/name-length-policy.md) and [duplicate names](../interface/duplicate-names-policy.md) policies, length first.
- K03 - Each turn shows "Round: NAME" and the match, such as "Semifinal 1: Ada against Dev". The status line shows "Now playing: NAME". "Start turn" deals the match's board. When the game ends, "Next turn" appears, or "Next match" when that game ends the match.
- K04 - "Leave tournament" is shown until the final ends. It asks first in a native dialog with Keep playing and Leave, as the [dialog policy](../interface/dialog-policy.md) requires, and Leave discards the tournament.
- K05 - The "Bracket" table has one body per match and the columns Match, Player, Moves, Time and Winner. Moves read "18 moves". Time uses the M:SS clock format. An unplayed game reads "Not played", an unknown player "To be decided" and an undecided match "Not decided".
- K06 - When the final ends, the heading becomes "Champion: NAME" and "Back to game" appears.
- K07 - Every Tournament screen has a "Tournament JSON" textarea, "Export tournament" and "Load tournament".

Each step that replaces the screen moves focus to its h2, which has tabindex="-1": opening the Tournament screen, Start tournament, Start turn, Next turn, Next match, a successful load, the end of the final, Back to game and Leave. The solo screen's h2 is "Solo game". A won game that isn't the final keeps focus on its last card.

The status paragraph in `Game.tsx` stays mounted across both screens, so it is still the page's one live region. It carries name errors, "Now playing: NAME", turn results and load outcomes.

## Results

Tournament games never change best scores or the saved board size: each turn plays a `Play` from `session.ts` that has no preferences, and the solo session is never replaced. The statistics omit Best during a tournament. A result keeps the game's moves and fractional active milliseconds, and [competition ties](competition-ties.md) decides each match from them.

Every match's board code comes from `unusedBoardCode` in `fresh-board.ts`, which retries `freshBoardCode` until the code is new to the event. Codes are chosen when the tournament starts.

## Exchange format

Export writes the current tournament. Its keys are alphabetical at every level:

```json
{
  "format": "neon-pairs/tournament",
  "matches": [
    {
      "boardCode": "np1-6-1",
      "results": [{ "elapsedMs": 70200.5, "moves": 20 }, null]
    },
    { "boardCode": "np1-6-2", "results": [null, null] },
    { "boardCode": "np1-8-1", "results": [null, null] }
  ],
  "players": ["Ada", "Bo", "Cora", "Dev"],
  "reviewing": true,
  "version": 1
}
```

Matches are in bracket order, and results fill in play order, first player first. `reviewing` is true while a finished game waits for Next turn or Next match. No players and no matches describe the setup. An unfinished game isn't exported, so loading during a turn starts that turn again.

Load validates the whole text, up to 65536 UTF-8 bytes, before it replaces anything. A field the format doesn't define shows "Unknown field: NAME." for the first one in document order. Any other failure shows "Invalid tournament." Both keep the draft and the current tournament. A successful load shows "Now playing: NAME" when a turn is waiting, and "Loaded tournament." otherwise.

## Past tournaments

Play that finishes a tournament saves it under `np3:tournaments` as `{"v":3,"items":[...]}`, newest first, keeping 10. Each item holds `matches` and `players` in the export shapes. A load never saves a record. The "Past tournaments" table on the setup and champion screens lists each record's champion and players.

A stored value that fails to parse or validate reads as no records and stays untouched until the next save. When storage is blocked, the table shows "Progress won't be saved on this device." and finished tournaments stay in memory for the page.

## Source and evidence

| Concern | Source | Tests |
| --- | --- | --- |
| Pairing, rounds, boards, winners and turn order | `src/game/tournament/rules.ts` | `rules.test.ts` |
| Name representation, length and repeats | `names.ts` | `names.test.ts` |
| Export and import | `format.ts` | `format.test.ts` |
| Saved records | `records.ts`, `use-past-tournaments.ts` | `records.test.ts` |
| Controller and clock | `use-tournament.ts`, `session/use-session-clock.ts` | `tests/timer-lifecycle.e2e.test.ts` |
| Screens | `TournamentHead.tsx`, `TournamentBody.tsx` and their parts | `tests/tournament*.e2e.test.ts` |

The browser journeys play a complete four-player event, open an eight-player bracket, check names, the dialog, export and load, storage failure, corrupt records, spacing, 44px targets and page width at 360, 390 and 1280 CSS pixels.
