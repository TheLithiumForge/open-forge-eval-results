---
open-forge:
  description: The Tournament screens, their controls and status text, the turn
    flow, focus, leave confirmation, tournament JSON and saved past tournaments.
  tags:
    - Competition
    - Interface
    - Tournament
---
# Tournament mode

This page describes how the browser runs a knockout for 4 or 8 people sharing one device, and where that behavior lives in the source.

The other competition pages own the event rules: [pairing](competition-pairing.md), [rounds](competition-rounds.md), [boards](competition-boards.md), [deals](competition-deals.md), [ties](competition-ties.md) and [scores](competition-scores.md). This page links to them instead of repeating them.

## Requested behavior

These points come from the product request of 5 November 2026:

- A Tournament button next to New Game opens the Tournament screen.
- Players choose 4 or 8 with a Players select, type names into inputs labelled Player 1 to Player 8, and press Start tournament.
- In each match both players play the same deal, one after the other, and fewer moves wins.
- The status line shows whose turn it is as "Now playing: NAME".
- A Start turn button begins each player's game. When a game ends a Next turn button appears, and when a match ends a Next match button appears.
- A Leave tournament button stops the tournament early.
- The bracket shows each match's players, their moves and time, and its winner. "Champion: NAME" appears at the end with a Back to game button.
- Finished tournaments stay in a Past tournaments list on the Tournament screen after reload.
- Every Tournament screen has an Export tournament button that puts JSON in a Tournament JSON box, and a Load tournament button that reads that box back.

## The screens

The Tournament screen replaces the game screen inside the same `main`. There is no router: `useTournament` holds an `open` flag and `Game.tsx` renders one screen or the other around the shared status line. Opening the Tournament screen focuses its h2 "Tournament". Back to game and Leave tournament focus the game screen's h2 "Game". Both headings have `tabindex="-1"`, as [Focus policy](../interface/focus-policy.md) requires.

Setup shows the Players select, the Player fields, Start tournament and Back to game. Below the status line come the Tournament JSON tools and Past tournaments. Start tournament checks names under the [text entry](../interface/text-entry-policy.md), [name length](../interface/name-length-policy.md) and [duplicate names](../interface/duplicate-names-policy.md) policies, in entry order. The first failing field gets `aria-invalid="true"`, and its message appears in the status line. Changing the player count keeps every draft.

During a tournament the screen shows "Round: NAME", the status line and an action row with the turn button and Leave tournament. A turn has three stages:

| Stage | What shows | Action button |
| --- | --- | --- |
| Ready | Status "Now playing: NAME" | Start turn |
| Playing | Moves, Pairs, Time, board help and the board | None |
| Done | Final statistics and the completion banner, no board | Next turn, Next match, or Back to game after the Final |

Start turn deals the match's board code and moves focus to the board's first card. The winning activation records the result, removes the board and moves focus to the action button. Next turn and Next match publish the next "Now playing: NAME" and leave focus on the same button, which now reads Start turn. After the Final, "Champion: NAME" and Back to game replace Next match, and Leave tournament goes away.

The bracket is a table with the caption "Bracket" and the columns Match, Player, Moves, Time and Winner. Each match is its own row group, with its two players in play order. Moves read "18 moves" and time reads `M:SS`. Unknown players and winners read "To be decided", and unplayed results read "Not played". Following the [tables policy](../interface/tables-policy.md), Past tournaments is also a table, captioned "Finished tournaments, newest first", with Champion and Players columns.

## Status text

Everything below goes through the page's one live region. [Announcements policy](../interface/announcements-policy.md) explains that region.

| Event | Status |
| --- | --- |
| A tournament starts, or Next turn or Next match | Now playing: NAME |
| A name fails its length check | Use 2 to 20 characters. |
| A name repeats another in the group | Each name must be different. |
| Export with no tournament on screen | No tournament to export. |
| Load with a field the format doesn't define | Unknown field: NAME. |
| Load with any other invalid text | Invalid tournament. |
| Load of an unfinished tournament | Loaded tournament. Now playing: NAME. |
| Load of a finished tournament | Loaded completed tournament. |

Start turn keeps the "Now playing" text without publishing it again. Turn results then use the ordinary game sentences.

## Leaving unfinished work

A native dialog with Keep playing and Leave asks first when work would be lost, as [Dialog policy](../interface/dialog-policy.md) requires. Keep playing takes focus, Escape keeps playing, and closing returns focus to the button that asked. The dialog asks in three cases:

- Tournament on the game screen while the current game is started and unfinished
- Leave tournament before a champion is decided
- Load tournament with valid text while an unfinished tournament is on screen

The clock keeps its ordinary behavior while the dialog is open. Leaving replaces the game, so a pending mismatch timer from the earlier game can't change the next one.

## Tournament JSON

Export writes a `neon-pairs/tournament` version 1 object, as [Data exchange policy](../sharing/data-exchange-policy.md) requires for new exports. An example with Ada's first result recorded:

```json
{
  "format": "neon-pairs/tournament",
  "matches": [
    { "boardCode": "np1-6-1", "results": [{ "elapsedMs": 4000, "moves": 18 }] },
    { "boardCode": "np1-6-2", "results": [] },
    { "boardCode": "np1-8-1", "results": [] }
  ],
  "players": ["Ada", "Bo", "Cora", "Dev"],
  "version": 1
}
```

`matches` lists every match in bracket order, opening round first. `results` holds up to two results in play order. Later players aren't stored. They follow from earlier winners. Loading checks the format and version first, then reports the first unknown field in text order, then checks the rest. A valid load needs 4 or 8 names that pass the name checks, one valid code per match at its round's size, distinct codes, completed-game move counts and results only up to the first unfinished match. Names are loaded in their accepted form. `src/game/tournament/format.ts` owns this format.

## Saved past tournaments

A finished tournament is saved when its Final ends, under `np3:tournaments` as `{"v": 3, "items": [...]}`, following [ADR 058](../decisions/adr-058-storage-namespace.md), [Persistence envelope](../persistence/persistence-envelope.md) and [Retention policy](../persistence/retention-policy.md). Each item has `matches` and `players` in the export's shape. The newest 10 are kept, newest first. A value that fails to parse or validate reads as no records and isn't written until the next save. When storage is blocked, the tournament still plays, and Past tournaments shows "Progress won't be saved on this device." beside the records kept in memory. `src/game/tournament/storage.ts` owns this value.

## Implementation choices

These choices were made during implementation and haven't been confirmed by the product owner. Each is easy to change in the named file.

- The Tournament button sits between New Game and Restart, so Restart stays the control before the board (`Controls.tsx`).
- In every match the first player listed plays first. Opening matches list the higher seed first, and later matches list winners in bracket order (`rules.ts`).
- When a game ends its board is removed, so the next player can't study a solved copy of the same deal (`TournamentScreen.tsx`).
- After the Final, Champion and Back to game replace Next match (`TournamentScreen.tsx`).
- Results keep exact active milliseconds, fractions included, in memory, exports and saved records. A loaded tournament therefore decides every match the same way. Snapshot export rounds instead (`format.ts`).
- Export holds recorded results only. A turn in progress isn't exported, and loading the export starts that turn again.
- An unfinished tournament lives in memory until reload, Leave or a load. Only finished tournaments are saved.
- Loading a finished tournament shows it without adding it to Past tournaments, just as a completed snapshot import records no best.
- Tournament outcomes and name errors appear only in the status line, with no second copy beside the tools.
- Tournament games show Moves, Pairs and Time without Best, because they keep no records.

## Source

| File | Responsibility |
| --- | --- |
| `src/game/tournament/rules.ts` | Seeds, rounds, board sizes, code allocation, winners, turns and name checks |
| `src/game/tournament/format.ts` | Tournament JSON export, record shape and validation |
| `src/game/tournament/storage.ts` | Past tournaments envelope, retention and blocked storage |
| `src/game/tournament/use-tournament.ts` | Screen state, turn stages, leave confirmation and actions |
| `src/game/tournament/use-screen-focus.ts` | Focus targets after screen and turn changes |
| `src/game/tournament/TournamentScreen.tsx` | The parts above and below the status line |
| `TournamentSetup.tsx`, `Bracket.tsx`, `PastTournaments.tsx`, `TournamentTools.tsx`, `LeaveDialog.tsx` | Setup form, tables, JSON tools and the native dialog |
| `src/game/tournament/labels.ts` | Exact labels and status text |

The session's `competition` flag keeps tournament games away from the saved size and best scores; see [competition scores](competition-scores.md). `rules.test.ts`, `format.test.ts` and `storage.test.ts` sit beside the rules. `tests/tournament-play.e2e.test.ts` and `tests/tournament-controls.e2e.test.ts` cover the browser journeys.
