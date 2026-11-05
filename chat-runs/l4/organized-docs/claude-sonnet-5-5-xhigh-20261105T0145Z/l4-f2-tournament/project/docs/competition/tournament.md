# Tournament

This page specifies the tournament mode: a knockout for 4 or 8 players who share one device.

Status: implemented on top of spec version 2.2. Board codes, snapshots and replays keep format version 1.

Each player plays one game on the match's deal, one after the other, and fewer moves win. The pages on [pairing](competition-pairing.md), [rounds](competition-rounds.md), [boards](competition-boards.md), [deals](competition-deals.md), [ties](competition-ties.md) and [scores](competition-scores.md) define the decisions that this page puts together.

## Entry

- K01 - Label a native button "Tournament" and put it right after New Game in the deal controls. It replaces the game screen with the Tournament screen, and focus moves to that screen's `h2`, which has `tabindex="-1"`. The game session stays in memory and is not changed.
- K02 - The setup has a native select labeled "Players" with options 4 and 8, a text input labeled "Player 1" to "Player N" for each entrant and a button "Start tournament". Entry order gives the seeds.
- K03 - Process every name as [Text entry policy](../interface/text-entry-policy.md) says: trim, collapse inner whitespace runs and normalize to NFC. Count code points after that step. A name of fewer than 2 or more than 20 shows "Use 2 to 20 characters." Names that match without regard to case show "Each name must be different." A failure blocks the start and keeps the drafts. The inputs have no `maxlength`, so the check sees what was typed.

## Bracket

- K04 - Pair by entry order. Four players meet as 1 against 4, then 2 against 3. Eight players meet as 1 against 8, 4 against 5, 3 against 6, then 2 against 7. Winners of matches 1 and 2 meet, then winners of matches 3 and 4, then the two winners meet in the Final. The better seed plays first in each match.
- K05 - Name the rounds Quarterfinal, Semifinal and Final, and show "Round: NAME" while a round is played. Play Quarterfinals on 4x4, Semifinals on 6x6 and the Final on 8x8. A bracket of four has no Quarterfinal.
- K06 - Choose every match's board code when the tournament starts, at the size of its round. Both players of a match play that one code, and no two matches share a full code. Seeds come from `freshBoardCode`, the only source of fresh randomness.

## Turns

- K07 - Show whose turn it is as "Now playing: NAME" in the game's one live region. "Start turn" begins that player's game on the match's deal, and focus moves to the board's first card. The board is not drawn before Start turn, so the next player never sees the faces.
- K08 - When a game ends, keep its completed board and show "Next turn". When the second game of a match ends, announce the winner in the same result and show "Next match" instead. "Next turn" and "Next match" remove the board and bring back "Start turn", which takes focus. The Final's second game ends the tournament without "Next match".
- K09 - The winner of a match has fewer moves. Equal moves go to the lower active time, compared as whole milliseconds recorded when the game ends, never from displayed text. Equal moves and time go to the higher seed, where seed 1 is highest.
- K10 - "Leave tournament" stops the tournament early. It opens a native `dialog` with "Keep playing" and "Leave". Keep playing takes focus when the dialog opens, and Escape keeps playing. Leave drops the unfinished tournament and returns to the setup. Nothing unfinished is saved.

## Results

- K11 - Show the bracket in a `table` with a caption "Bracket" and `th scope="col"` headers Round, Match, Player, Moves, Time and Result. Each match has one row for each player. A player who is not yet known shows "To be decided". The winner shows "Winner" and the other player "Eliminated".
- K12 - When the Final ends, show "Champion: NAME" and a "Back to game" button. Back to game returns to the game screen and focus returns to the Tournament button. The setup screen has "Back to game" too.
- K13 - Tournament games never change the saved board size or any best score. They run in their own session whose preferences are never read or written, so neither replacing a game nor a win can reach the saved preferences.

## Records

- K14 - Keep each finished tournament in a list of the newest 10, and show it as "Past tournaments" on the setup screen, newest first, after reload. The list is stored under `np3:tournaments` as a JSON object with exactly `v`, the number 3, and `items`. Items are tournament documents of format `neon-pairs/tournament`. A value that cannot be read counts as empty and stays untouched until the next save. One bad item rejects the list.
- K15 - When the browser store is blocked, keep working in memory and show "Progress won't be saved on this device." with the past list. A tournament that finishes while writes fail shows it beside the champion.

## Exchange

- K16 - Every Tournament screen has a textarea labeled "Tournament JSON", a button "Export tournament" and a button "Load tournament". Export puts the document in the textarea. Load reads the textarea back.
- K17 - The document is a JSON object with `format` set to `neon-pairs/tournament`, a whole-number `version` of 1, `players` in entry order and `matches` in play order. Each match has `boardCode` and `results`, and each result has `elapsedMs` and `moves`. Keys are in alphabetical order at every level. Rounds, pairings, winners and the champion are derived. A document without matches is a draft of the setup.
- K18 - Validate the whole text before replacing anything, limited to 65536 UTF-8 bytes. A field the format does not define shows "Unknown field: NAME." for the first one in document order. Any other problem shows "Invalid tournament." Names must be accepted names, board codes must have the size of their round and be different, results must have at least one move for each pair and matches must be played in order. A failed load keeps the current screen and the typed text. A loaded tournament is untrusted, so it is not added to the saved list.

## Layout and access

- K19 - Every new control is at least 44 by 44 CSS pixels at 390 pixels wide, and the page does not scroll sideways. Tables scroll inside their own focusable region.
- K20 - Announce results through the one polite, atomic live region in `Game.tsx`. The screen adds its player line to that region and adds no second live region.

Placement: the rules are in `src/game/tournament/rules.ts` and import no React or browser global. The controller and its clock exist only while the Tournament screen is shown, and the past list is held by `Game.tsx`. [Source layout](../architecture/source-layout.md) lists the other files. Return to [Neon Pairs](../README.md).
