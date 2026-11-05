---
open-forge:
  description: Game options and reproduction controls
  tags:
    - Game
    - Controls
---

# Controls

Controls is a specification that defines the game options and reproduction tools in Neon Pairs.

Status: spec version 2.2.

You can start another deal, repeat the current one, play a shared-device tournament or load saved progress. Each control keeps the same label, so you can find the same action after a game changes.

## Deal controls

The main controls are:

- C01 - Label the native size select "Grid size". Give it options `4x4`, `6x6`, `8x8`, `10x10`, `12x12`, `14x14` and `16x16`, with numeric side length `N` as each value. After a successful board-code or snapshot load, select the loaded board's size.
- C02 - Label the fresh-deal button "New Game". It creates a fresh seed and keeps the current size.
- C03 - Label the repeat-deal button "Restart". It starts the same board code again.

Changing size, starting and restarting follow the session rules in [Rules](../gameplay/rules.md).

- C15 - Put a button labelled "Tournament" immediately after New Game. It opens the tournament screen and leaves the ordinary game available when the group returns.
- C16 - Let the group choose 4 or 8 players with a native select labelled "Players". Show one native text input for each selected player, labelled "Player 1" through the selected count. On Start tournament, normalize names as defined in [Text entry policy](text-entry-policy.md), require 2 to 20 Unicode code points and reject case-insensitive duplicates with the messages defined by the name policies.
- C17 - Pair entrants in entry order as defined in [Competition pairing](../competition/competition-pairing.md). Show the active stage as "Round: NAME" and use the board sizes in [Competition boards](../competition/competition-boards.md).
- C18 - Give every match its own board code, and use that same code for both players' turns. The lower move count wins; equal moves compare active elapsed milliseconds, then higher seed wins.
- C19 - Show "Now playing: NAME" and a Start turn button for each player's game. After a completed game, show Next turn; after both players finish a match, show Next match. Show each match's players, moves, time and winner. After the final match, show "Champion: NAME" and Back to game. Leave tournament stops an unfinished event.
- C20 - Tournament play does not change the saved solo size or best moves. Keep completed tournaments in a Past tournaments list across reloads.
- C21 - Every tournament screen has a Tournament JSON textarea, Export tournament button and Load tournament button. Export writes a versioned JSON value into the field; load validates the full draft before replacing tournament state. Invalid input keeps the current tournament and draft.

## Reproduction tools

- C04 - Put reproduction controls inside a native `details` element that starts collapsed. Give its summary the exact text "Reproduce a game".

The controls use the board-code and snapshot formats defined in [Reproducibility](../sharing/reproducibility.md). A board code starts a deal. A snapshot loads progress on a deal.

## Load a board

- C05 - Label the text input "Board code" and limit it to 32 characters. Show the current board code after a new deal, Restart or a successful load. Keep an edited draft when a card action changes the game.

- C06 - Label its button "Load board". Validate the entered code before replacing the current game with that deal's starting state.

For example, loading `np1-4-1` starts its hidden four-column board. Entering that code alone keeps the current game until you select Load board.

## Snapshot tools

- C07 - Label the textarea "Snapshot JSON" and limit it to 65536 characters. The parser also applies the UTF-8 byte limit in the snapshot format.

- C08 - Label the export button "Export snapshot". Fill the textarea with readable version 1 snapshot JSON that you can select and copy manually. Export leaves the game state and clock unchanged. It requires no Clipboard API.

Export `elapsedMs` and a pending mismatch's `remainingMs` as whole milliseconds. A pending mismatch always exports at least 1ms.

- C09 - Label the import button "Load snapshot". Validate the complete draft before replacing the current game. Load unfinished progress paused and show "Loaded snapshot. Select Resume to continue." Load completed progress as completed without pausing and show "Loaded completed snapshot."

- C10 - Show a "Resume" button only while an imported unfinished game is paused. Selecting it clears that pause. Unfinished play continues from the loaded state. While paused, block every card activation and allow board focus movement. On Resume, move focus to the board's remembered tab stop before removing the Resume button. A loaded completed game stays completed and shows no Resume button.

- C11 - On invalid input, keep the current game and the entered draft for correction. Show the exact status for that control:

| Control       | Status              |
| ------------- | ------------------- |
| Load board    | Invalid board code. |
| Load snapshot | Invalid snapshot.   |

- C12 - A loaded completed snapshot keeps the win banner static and plays no celebration. Import doesn't write a best score. Resuming an unfinished snapshot and later winning records a local best under R10.

For example, loading a completed game with fewer moves than the saved best shows that game without replacing the saved record.

## Focus

- C13 - Keep focus on the button used for starting, restarting, loading or exporting. These actions don't move focus to the board. Resume follows C10 because its button disappears. The board's remembered tab stop follows the focus rules in [Input](input.md#focus).

## Replay

- C14 - Keep replay in the developer CLI and game core. V1 has no replay controls in the game UI.

Run `npm run --silent replay -- PATH` to read a replay file. On valid input, print only the final snapshot JSON to stdout and exit 0. On invalid input, print nothing to stdout, write a message to stderr and exit nonzero.

The complete game pack starts in [Neon Pairs](../README.md).
