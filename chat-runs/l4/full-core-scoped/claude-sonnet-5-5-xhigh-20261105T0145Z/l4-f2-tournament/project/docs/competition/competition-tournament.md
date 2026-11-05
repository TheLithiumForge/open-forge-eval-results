---
open-forge:
  description: Tournament mode for four or eight players on one device, from the
    Tournament button to the champion, with its storage and JSON exchange.
  tags:
    - Game
    - Competition
    - Tournament
    - Controls
---
# Tournament mode

Tournament mode is a knockout for four or eight people who share one device. In every match both players play the same deal, one after the other, and fewer moves win.

The decisions behind it are in the other pages of this scope: [pairing](competition-pairing.md), [rounds](competition-rounds.md), [boards](competition-boards.md), [deals](competition-deals.md), [ties](competition-ties.md) and [scores](competition-scores.md). This page describes the screens and controls that carry them out.

## Entering

The Tournament button sits next to New Game in the deal bar, between New Game and Restart. It opens the Tournament screen in place of the solo game. The solo game stays in memory, with its clock stopped, and Back to game returns to it with focus on the Tournament button.

The Tournament screen has a Players select with the options 4 and 8, one text input for each player labelled Player 1 to Player N, a Start tournament button and a Back to game button. Entry order is the seed order. Names follow [Text entry](../interface/text-entry-policy.md), [Name length](../interface/name-length-policy.md) and [Duplicate names](../interface/duplicate-names-policy.md): a name is trimmed, collapsed and composed, has 2 to 20 code points, and differs from every other name without regard to case. A failure blocks the start, keeps the drafts and shows "Use 2 to 20 characters." or "Each name must be different." in the page's status paragraph. Past tournaments are listed below the form.

## Playing

Each screen of a running tournament has an h2. Its text is "Round: NAME", where NAME is Quarterfinal, Semifinal or Final, and it takes focus when the screen appears. Below it a line names the match, such as "Match 1 of 2: Ada vs Dev".

- The status paragraph shows "Now playing: NAME" for the player whose turn it is.
- Start turn begins that player's game on the match's board code. The board is not shown before it.
- When the game ends, Next turn brings up the second player. When the second game ends, Next match brings up the next match, possibly in the next round.
- Leave tournament asks first in a native dialog with Keep playing and Leave. Keep playing takes focus when the dialog opens and Escape keeps playing. Leave discards the tournament and shows the Tournament screen.
- When the Final ends there is no further match, so the screen shows "Champion: NAME" with a Back to game button in place of Next match.

A turn shows Moves, Pairs and Time as in the solo game. It shows no Best, because tournament games never change best moves or the saved size.

## The bracket

Every screen of a running or finished tournament shows the bracket as a table with the caption "Bracket" and the column headers Match, Player, Moves and Time. Each match has one row for each player, in play order. A place that an earlier match has not decided reads "To be decided", and a turn that has not been played shows "-" for its moves and time. The winner of a finished match is marked with the text "(winner)" after the name. Time is shown as in the solo game, while the comparison uses whole milliseconds.

## Past tournaments

A finished tournament is added to the Past tournaments list, newest first, and shown as "Champion: NAME" with its player count. Only a tournament played to its end here is added. One loaded from JSON is shown but not added.

The list is stored under the key `np3:tournaments` as a JSON object with exactly the keys `v`, the number 3, and `items`, the list of records. A record has the keys `matches` and `players`. The list keeps its newest 10 records. A value that is missing, malformed or wrongly shaped reads as an empty list without a notice and stays in the browser until the next save replaces it. When browser storage is blocked, the tournament and the list keep working in memory, and the Past tournaments section shows "Progress won't be saved on this device." A running tournament is not stored. Only the browser storage of the preferences key and this key is touched, and neither is cleared.

## Export and load

Every Tournament screen has an Export tournament button, a Load tournament button and a Tournament JSON box. Export puts readable JSON in the box without changing the screen. It exports the tournament on screen with the results recorded so far, or the entry form while no tournament has started. Load tournament reads the box. A valid document replaces what is on screen and shows "Loaded tournament." An invalid one keeps the screen and the box, and shows "Invalid tournament." or, for the first field the format does not define, "Unknown field: NAME."

The document is a new exchange format under [Data exchange](../sharing/data-exchange-policy.md). Its keys are in alphabetical order at every level.

| Key | Meaning |
| --- | --- |
| `format` | The text `neon-pairs/tournament` |
| `matches` | One entry for each match in bracket order, or an empty list for the entry form |
| `players` | 4 or 8 names in entry order |
| `version` | The number 1 |

A match has `code`, its full board code, and `results`, a list of two entries in play order. Each entry is `null` or an object with `elapsedMs` and `moves`. Winners, rounds and the champion are derived. A document is valid only when its text is within 65536 bytes, it has exactly these keys, each match has a different board code at the size of its stage, results follow the order of play and every number is a plausible integer. With results, the names must also pass the name checks. Without matches, the names may still be unfinished, so a draft of the form can be exported and loaded.

## Source

Tournament code lives in `src/game/tournament/`. `rules.ts` holds the bracket, pairing, round, winner and champion rules and imports neither React nor a browser global. `names.ts`, `format.ts`, `bracket.ts` and `turn.ts` are pure too. `deals.ts` takes its board codes from `freshBoardCode`, the one random source. `storage.ts` reads and writes the saved list, and `use-tournament.ts` and `use-records.ts` connect them to React. The turn's game is a session of its own with preferences that are never read from or written to the browser store, so the solo session's preferences and their saved value cannot change. A tournament screen owns its own session clock, which exists only while the screen is open.
