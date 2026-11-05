---
open-forge:
  description: The shipped Tournament screen, its knockout flow, results, records and exchange
    format, with the source that implements it.
  tags:
    - Competition
    - Specification
    - Interface
---
# Tournament

Tournament is the knockout mode for 4 or 8 people sharing one device. It builds on the competition decisions in this folder and the project-wide policies they rely on.

The rules live in `src/game/tournament/rules.ts`. The screen, its hook and its storage and exchange modules sit beside them. A turn's game runs through `src/game/session/use-turn-game.ts`, which reuses the solo turn and clock code without saved preferences.

## Opening and leaving

- K01 - Put a native "Tournament" button directly after New Game. It replaces the main area with the Tournament screen. The solo game stays in memory with its active time and any pending mismatch paused, and "Back to game" returns to it. Each screen change moves focus to that screen's h2, which has `tabindex="-1"`. The solo screen's h2 is "Solo game".
- K02 - "Leave tournament" stops an unfinished tournament after the confirmation in [Dialog policy](../interface/dialog-policy.md). Leave returns to the solo game. Loading a tournament over an unfinished one asks the same question. The turn clock keeps running while the dialog is open.

## Setup

- K03 - Label the native select "Players", with options 4 and 8. Label the name inputs "Player 1" to "Player 8" and show as many as the select chooses. Drafts stay as typed.
- K04 - "Start tournament" accepts the names under [Text entry policy](../interface/text-entry-policy.md), then checks [Name length policy](../interface/name-length-policy.md) and [Duplicate names policy](../interface/duplicate-names-policy.md), in that order. A failed check publishes its message and starts nothing.
- K05 - Seeds, opening matches, round names and board sizes follow [pairing](competition-pairing.md), [rounds](competition-rounds.md) and [boards](competition-boards.md). The play screen's h2 is "Round: NAME".

## Turns and matches

- K06 - Both players of a match play its one board code, the first-listed player first. Every match of a tournament has a different code. Codes come from `freshBoardCode`; a repeated draw is drawn again.
- K07 - Publish "Now playing: NAME" through the page's one live region when a turn is ready. "Start turn" mounts that player's board and moves focus to its first card. Turn results use the solo announcements.
- K08 - When a game ends, its board stays and "Next turn" appears, or "Next match" when the match is decided. Next turn moves focus to Start turn. Next match moves focus to the h2. When the final is decided, the screen shows "Champion: NAME" as its h2 with Back to game.
- K09 - Decide a match by [ties](competition-ties.md), using the unrounded active milliseconds of each game. Tournament games never change best scores or the saved board size, as [scores](competition-scores.md) requires.

## Bracket and records

- K10 - Show the bracket as a table captioned "Bracket", with Match, Player, Moves and Time columns. Give each player of each match a row, mark the winner with "(winner)" after the name, and name later players by the match they come from, such as "Winner of Semifinal 1".
- K11 - Save each tournament finished on this device under `np3:tournaments` as `{"v": 3, "items": [...]}`, newest first, keeping 10. Show them under "Past tournaments" on the setup and champion screens, with "Progress won't be saved on this device." there when storage is blocked. A stored value that fails to validate reads as empty and stays until the next save. Loaded tournaments are never saved unless they finish here.

## Export and load

- K12 - Every Tournament screen has the "Tournament JSON" textarea, "Export tournament" and "Load tournament". Export writes the tournament with `"format": "neon-pairs/tournament"` and `"version": 1`, keys in alphabetical order at every level and elapsed time unrounded. Export with no tournament shows "There is no tournament to export."
- K13 - Load validates the whole draft first. An unknown field shows "Unknown field: NAME." for the first one in document order; anything else invalid shows "Invalid tournament.". Both keep the draft and the tournament on screen. A valid load shows "Loaded tournament." beside the tools and resumes at the next turn, or at the champion.

For example, after Ada finishes the first quarterfinal turn, exporting and loading that text later shows "Round: Quarterfinal" and "Now playing: Hal", with Ada's moves in the bracket.

Unit evidence is in `rules.test.ts`, `format.test.ts` and `records.test.ts` beside the rules. Browser journeys are `tests/tournament-play.e2e.test.ts`, `tests/tournament-tools.e2e.test.ts` and `tests/tournament-layout.e2e.test.ts`.
