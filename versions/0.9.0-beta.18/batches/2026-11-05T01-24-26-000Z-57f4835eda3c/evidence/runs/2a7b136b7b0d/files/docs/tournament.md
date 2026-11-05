# Tournament

Tournament is a specification for a knockout between four or eight players who share one device in Neon Pairs.

Status: added to spec version 2.2. Tournament JSON has its own format version 1.

Both players of a match play the same deal, one after the other, and fewer moves wins. The device passes from player to player, so the screen always says whose turn it is and waits for that player to start.

## Open and leave the screen

- M01 - Put a native button labelled "Tournament" in the deal controls, directly after New Game. It replaces the main area with the Tournament screen and moves focus to that screen's `h2`, "Tournament", which has `tabindex="-1"`. "Back to game" returns to the solo game and moves focus to its `h2`, "Solo game". The solo game keeps its state while the Tournament screen is shown and counts no active time until it returns.

## Players

- M02 - Label the native select "Players" with the options `4` and `8`. Label one text input per player "Player 1" through "Player 8", showing as many as the select chooses. "Start tournament" accepts each name trimmed, with each inner whitespace run as one space, in NFC. A name with fewer than 2 or more than 20 code points blocks the start with "Use 2 to 20 characters." Names that repeat without regard to case block it with "Each name must be different." A blocked start keeps the entries and the focus.
- M03 - Seeds follow entry order, so the first player is seed 1. Four players open with 1 against 4, then 2 against 3. Eight players open with 1 against 8, 4 against 5, 3 against 6, then 2 against 7. Each later match pairs the winners of two neighboring matches.

For example, Ada, Bo, Cora, Dev, Emi, Finn, Gia and Hal open with Ada against Hal, Dev against Emi, Cora against Finn and Bo against Gia.

## Matches

- M04 - Name rounds Quarterfinal, Semifinal and Final. Four players start at Semifinal. Play quarterfinals on 4x4, semifinals on 6x6 and the final on 8x8. Show "Round: NAME" and the match, such as "Semifinal 1: Ada against Dev", while that round is played.
- M05 - Give every match its own fresh board code, different from every other match in the tournament. Both players play that code from its starting state, the first listed player first.
- M06 - Show whose turn it is as "Now playing: NAME" through the page's one live region. The board waits closed and ignores card activation until "Start turn". Start turn moves focus to the board's remembered card before the button disappears, like Resume. Turn results use the announcements in Input.
- M07 - When a game ends, keep its board and focus and show "Next turn" after the first game of a match or "Next match" after the second. Either button moves focus to the next "Start turn" and publishes the next "Now playing" status.
- M08 - The player with fewer moves wins the match. Equal moves go to the lower active elapsed time, compared at the game's own precision rather than the displayed seconds. Equal times go to the higher seed, and seed 1 is the highest.
- M09 - After the final, show "Champion: NAME" with a "Back to game" button and save the finished tournament.
- M10 - Label the button "Leave tournament" while a tournament is unfinished. It asks first in a native `dialog` with "Keep playing", which takes focus, and "Leave". Escape keeps playing. Leave returns to the player entry and saves nothing.
- M11 - Tournament games never change the saved board size or best scores. Their statistics show Moves, Pairs and Time without Best.

## Bracket

- M12 - Show the bracket as a `table` with the caption "Bracket" and `th scope="col"` headers Seed, Player, Moves and Time. Each match starts with a row naming it, followed by one row per player. A side that waits for an earlier match reads "Winner of MATCH". Moves read "18 moves", time uses the `m:ss` clock format and an unplayed game reads "Not played". Mark the winner with "(winner)" after the name.

## Past tournaments

- M13 - Store finished tournaments under `np3:tournaments` as `{"v":3,"items":[...]}`, newest first, keeping the newest 10. Show them on the Tournament screen in a table captioned "Past tournaments" with Entrants and Champion columns. A stored value that fails to parse or validate reads as no records, without an error, and stays untouched until the next save. When storage is blocked, keep finished tournaments in memory for the visit and show "Progress won't be saved on this device." under the table.

## Tournament JSON

- M14 - Give every Tournament screen a "Tournament JSON" textarea limited to 65536 characters, with "Export tournament" and "Load tournament" buttons. Export fills the textarea with readable JSON and changes nothing else. Before a tournament starts, export describes the one the entered names would start, or shows the name message from M02.
- M15 - Load validates the complete draft, up to 65536 UTF-8 bytes, before replacing anything. The first field the format doesn't define shows "Unknown field: NAME." Any other failure shows "Invalid tournament." Both keep the current tournament and the draft. A valid load continues at the next unplayed game with its "Now playing" status, or shows a finished tournament with "Loaded completed tournament." without saving it.

The export holds `format`, `matches`, `players` and `version`, with keys in alphabetical order at every level. Each match holds the `attempts` played so far and its `boardCode`. Each attempt holds `elapsedMs` at the game's own precision and `moves`. Matches are in bracket order, round by round. This example has one finished game:

```json
{
  "format": "neon-pairs/tournament",
  "matches": [
    { "attempts": [{ "elapsedMs": 4321.75, "moves": 21 }], "boardCode": "np1-6-1" },
    { "attempts": [], "boardCode": "np1-6-2" },
    { "attempts": [], "boardCode": "np1-8-1" }
  ],
  "players": ["Ada", "Bo", "Cora", "Dev"],
  "version": 1
}
```

A valid tournament has accepted, distinct names, one board code of each round's size per match, no repeated codes, at most two attempts per match and matches played in order. An attempt needs a safe integer move count from the board's pair count to `999999` and an elapsed time from `0` to `359999999` milliseconds.

The competition pages explain the reasons behind these rules. The complete game pack starts in Neon Pairs.
