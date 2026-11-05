# Tournament

Tournament is a specification for knockout play among four or eight people who share one device in Neon Pairs.

Status: extends spec version 2.2. Board codes, snapshots and replays keep format version 1.

Pass the device between players. In each match both players play the same deal, one after the other, and fewer moves wins. The competition pages explain the reasons behind these rules; this page is the contract.

## Entry

- M01 - Put a native "Tournament" button right after New Game in the deal controls. It replaces the main area with the Tournament screen, whose h2 is "Tournament" with `tabindex="-1"`. Move focus to that h2. The game screen has an h2 "Game" with `tabindex="-1"`, and Back to game moves focus to it. Page load keeps the browser's focus. While the Tournament screen is open the ordinary game, its clock and its pending mismatch wait. The ordinary game keeps its progress.
- M02 - Label a native select "Players" with options `4` and `8`. Show one text input per player, labelled "Player 1" through "Player N", and a "Start tournament" submit button. The inputs start empty, have no native length limit and keep their drafts when Players changes.
- M03 - Accept each name after trimming both ends, collapsing each inner whitespace run to one space and normalizing to NFC. A name has 2 to 20 Unicode code points, or "Use 2 to 20 characters." blocks the start. Names compare without regard to case within the group, and a repeat blocks the start with "Each name must be different." Check lengths before repeats. Publish the message through the page's live region, mark each offending input `aria-invalid="true"` and keep focus where it was. Show and store the accepted spelling, not its lowercase comparison key.

## Bracket

- M04 - Entry order gives the seeds, so Player 1 is seed 1. Four players open as 1 against 4, then 2 against 3. Eight players open as 1 against 8, 4 against 5, 3 against 6, then 2 against 7. Later matches take the winners of the two matches before them in order. The first player listed in a match plays first.
- M05 - Name the rounds Quarterfinal, Semifinal and Final. Four players have no Quarterfinal. Play Quarterfinals on 4x4 boards, Semifinals on 6x6 and the Final on 8x8. Show the round being played as "Round: NAME".
- M06 - Give every match one board code and use it for both players of that match. Give every match in a tournament a different full board code. Draw codes through `freshBoardCode` in `src/game/session/fresh-board.ts`, the only random source, and draw again when a code is already used.

## Play

- M07 - Show whose turn it is as "Now playing: NAME" inside the page's one live region, in the same update as the latest turn result. Before a turn the board is not shown. "Start turn" creates a hidden game on the match deal and moves focus to the board's first card. Time starts on the first reveal and the turn publishes the ordinary turn results.
- M08 - When a game ends, record its moves and whole active milliseconds in the bracket at once. Keep the finished board on screen. Show "Next turn" after the first player of a match and "Next match" after the second. Next turn and Next match clear the board and wait for Start turn, which keeps focus on the same button. Winning does not move focus.
- M09 - Show "Leave tournament" while a tournament is unfinished. It opens a native dialog with the buttons "Keep playing" and "Leave". Keep playing takes focus when it opens and Escape keeps playing. Leave drops the unfinished tournament, shows the entry screen with its focus on the h2, and saves nothing. The clock keeps its normal rules while the dialog is open.
- M10 - After the final, show "Champion: NAME" in the live region and a "Back to game" button, and add the tournament to the past list. Back to game is also available on the entry screen.

## Results

- M11 - The player with fewer moves wins a match. Equal moves go to the lower active time in whole milliseconds, compared as stored and not as displayed. Equal time goes to the higher seed. The winner is derived from the recorded results and is not stored.
- M12 - Show the bracket as a table with the caption "Bracket" and `th scope="col"` headers Match, Player, Moves, Time and Board code. Use one row per player, the match label in the first row of its pair, `M:SS` for time and "To be decided" for a player not yet known. Put "(winner)" after the winner's name, so state doesn't rest on color.
- M13 - Tournament games never change the saved size or any best move count. Tournament games run in a session of their own that is never saved, and finishing one skips the best-score update.

## Records

- M14 - Keep finished tournaments under the key `np3:tournaments` as `{"v":3,"items":[...]}` with exactly those two keys. Save the newest 10, oldest first, when a tournament finishes. Show them newest first in a table with the caption "Past tournaments" and the headers Champion and Players, on every Tournament screen. A stored value that fails validation reads as empty and stays until the next save. A loaded tournament is not added to the list.
- M15 - When storage is blocked, keep working in memory and show "Progress won't be saved on this device." under the Past tournaments table.

## Exchange

- M16 - Every Tournament screen has a label "Tournament JSON" for a textarea, an "Export tournament" button and a "Load tournament" button. Export fills the textarea with readable JSON whose keys are in alphabetical order at every level: `format` "neon-pairs/tournament", `matches`, `players` and `version` 1. Each match has `boardCode` and `results`, and each result has `elapsedMs` and `moves`. Names appear in entry order. Before a tournament starts, Export writes the entry list with no matches.
- M17 - Load validates the whole text before replacing anything. Show "Loaded tournament. Select Start turn to continue." for unfinished progress, "Loaded completed tournament." for a finished one and "Loaded players." for an entry list, which fills Players and the inputs. A turn that was in progress restarts on its deal. Show "Unknown field: NAME." for the first field the format doesn't define, in document order, and "Invalid tournament." for any other failure. Keep the current state and the draft on failure.

## Layout

- M18 - Every control is at least 44 by 44 CSS pixels at 390 pixels wide. The page stays within the viewport and the bracket scrolls inside its own focusable region. Spacing uses the Visuals scale and nothing animates.

The complete game pack starts in Neon Pairs.
