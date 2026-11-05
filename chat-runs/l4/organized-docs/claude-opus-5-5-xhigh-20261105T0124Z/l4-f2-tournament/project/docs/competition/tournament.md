# Tournament
Tournament is the specification of the shared-device knockout for 4 or 8 players in Neon Pairs.

Status: spec version 2.2 with the tournament extension.

Players enter their names, then pass one device around. In each match both players play the same deal, one after the other, and the fewer moves wins. The other competition pages explain the reasoning behind each rule; this page states what the game does.

## Open and set up

- K01 - Show a "Tournament" button directly after New Game. It replaces the main area with the Tournament screen and moves focus to that screen's h2 "Tournament", which has `tabindex="-1"`. Opening it leaves the ordinary game. If that game has started and isn't won, ask first in the leave dialog of K10.
- K02 - Label the player-count select "Players" with options `4` and `8`. Show that many text inputs labelled "Player 1" through "Player 8" and a "Start tournament" button. Store and show each name trimmed, with inner whitespace collapsed and in NFC, as [Text entry policy](../interface/text-entry-policy.md) requires. Block a name outside 2 to 20 code points with "Use 2 to 20 characters." and repeated names in any capitalization with "Each name must be different."
- K03 - Seed players in entry order and open the bracket as [Pairing](competition-pairing.md) lists. Winners of neighbouring matches meet in the next round.

## Play

- K04 - Name rounds Quarterfinal, Semifinal and Final, and show "Round: NAME" while that round is played. Play them on 4x4, 6x6 and 8x8 boards. Both players of a match play one board code. Every match in a tournament has a different full board code, drawn through `freshBoardCode`.
- K05 - Play match by match, first seat then second. Announce whose turn it is as "Now playing: NAME" through the game's one live region. A "Start turn" button shows the board with a fresh game of the match's deal and focuses its first card. The board stays hidden between turns.
- K06 - When a game ends, keep its board and show "Next turn", or "Next match" when that game ended the match. Either button hands over to the next player and focuses Start turn.
- K07 - Fewer moves win. Equal moves go to the lower active time, then to the higher seed. Results keep the game's exact active milliseconds, and the bracket, the comparison and the export use that same value.
- K08 - Tournament games never change the saved board size or best scores, and show no Best statistic.

## Results

- K09 - Show the bracket as a table captioned "Bracket" with `th scope="col"` headers Round, Player, Moves, Time and Winner. Each match has a row per player. When the final ends, publish "Champion: NAME" in the same announcement as the last turn result and show a "Back to game" button, which starts a fresh ordinary deal at the saved size.
- K10 - A "Leave tournament" button stops a running tournament early. It asks first in a native dialog with "Keep playing", which takes focus, and "Leave". Escape keeps playing. Leaving returns to the ordinary game and focuses the Tournament button.
- K11 - Save each tournament finished through play under `np3:tournaments` as `{"v": 3, "items": [...]}`, newest first, keeping 10. Show them in a "Past tournaments" table on the setup and finished views. Unusable saved text reads as no records and stays untouched until the next save. Blocked storage keeps them in memory and shows "Progress won't be saved on this device." beside the table.

## Exchange

- K12 - Every Tournament view has a "Tournament JSON" textarea with "Export tournament" and "Load tournament" buttons. Export writes `{"format": "neon-pairs/tournament", "matches": [{"boardCode", "results"}], "players", "version": 1}` with keys in alphabetical order at every level. A result is `{"elapsedMs", "moves"}` or `null` for a game not yet played. On the setup view, Export writes a new tournament with fresh deals for the entered players.
- K13 - Load validates the whole text before replacing the tournament. A field the format doesn't define shows "Unknown field: NAME." for the first such field in reading order. Any other problem shows "Invalid tournament." Both keep the current tournament and the draft, and both go through the live region as well as the notice beside the buttons. A loaded tournament resumes at the next player's handoff, or shows its champion when finished. Loading never adds to Past tournaments.

For example, this tournament has finished its first semifinal game and waits for Dev:

```json
{"format":"neon-pairs/tournament","matches":[{"boardCode":"np1-6-1","results":[{"elapsedMs":70200,"moves":21},null]},{"boardCode":"np1-6-2","results":[null,null]},{"boardCode":"np1-8-3","results":[null,null]}],"players":["Ada","Bo","Cora","Dev"],"version":1}
```

## Code

The rules live in `src/game/tournament/rules.ts` with the bracket shape in `bracket.ts`, names in `names.ts`, the export format in `exchange.ts` and saved records in `records.ts`. None of them imports React or a browser global. `use-tournament.ts` drives the screen through the session's competition mode, and `Game.tsx` keeps the live region mounted between the Tournament screen's two parts.

Return to [Shared-device competition](competition-overview.md) or [Neon Pairs](../README.md).
