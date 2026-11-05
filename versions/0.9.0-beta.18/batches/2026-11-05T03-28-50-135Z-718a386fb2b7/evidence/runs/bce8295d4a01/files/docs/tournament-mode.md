# Tournament mode

Tournament mode runs a shared-device knockout event for four or eight named players. The Tournament button beside New Game opens the setup screen. Solo play stays mounted behind that screen, so its board, selected size and saved bests survive a visit to Tournament.

Status: spec version 2.3.

## Entry and bracket

The Players select accepts 4 or 8. Inputs are labelled Player 1 through Player 8, with only the selected number shown. On Start tournament, each accepted name is trimmed, inner whitespace is collapsed, and the text is normalized to NFC. Names must contain 2–20 Unicode code points and be unique without regard to case within that event. The exact validation messages are `Use 2 to 20 characters.` and `Each name must be different.`

Seeds follow entry order. Opening matches are fixed:

| Players | Opening matches, in order           |
| ------- | ----------------------------------- |
| 4       | 1 vs 4, then 2 vs 3                 |
| 8       | 1 vs 8, 4 vs 5, 3 vs 6, then 2 vs 7 |

Winners advance through Quarterfinal, Semifinal and Final rounds. A four-player bracket starts at the Semifinal. Quarterfinals use 4x4 boards, semifinals use 6x6 boards and finals use 8x8 boards. Each match has one full board code shared by both players; codes are unique across the event.

## Turns and results

The screen shows `Now playing: NAME`. Start turn begins the first player's game, Next turn begins the opponent's game and Next match advances after a match has a winner. Both players of one match replay the same deal from a fresh, hidden board. Moves and active elapsed time reset between those games.

Fewer moves wins. If move counts are equal, lower active elapsed milliseconds wins. If both values are equal, the lower seed number wins. Each result is captured from the completed game state. The bracket table displays the round, both names, each player's moves and formatted time, and the match winner; unresolved players and results are labelled as such. The final screen shows `Champion: NAME` and Back to game.

Tournament boards use the ordinary game rules and status, but they do not update the solo preferred size or best-move records. Leaving an unfinished tournament opens the native confirmation dialog. Keep playing has initial focus; Escape keeps the event open. Leave discards the active event without adding it to Past tournaments.

## Past events and JSON

Completed tournaments are saved locally under `np3:tournaments` in the version 3 `{ "v": 3, "items": [...] }` envelope. The list is ordered newest completion first and retains at most ten unique events. It appears on the Tournament screen after reload. If browser storage cannot be used, the screen shows `Progress won't be saved on this device.` and the event remains playable in memory.

Every Tournament screen has a Tournament JSON textarea with Export tournament and Load tournament buttons. Export fills the box with a `neon-pairs/tournament` JSON object at format version 1. Keys are sorted alphabetically at each object level; text is bounded to 65,536 UTF-8 bytes. An in-progress player's game is included as a validated snapshot. Loading validates the full object before restoring the event. Unknown fields report `Unknown field: NAME.`; other invalid tournament data reports `Invalid tournament.`. Export and load use manual text selection and paste; neither uses the Clipboard API.

Only completed events are written to the Past tournaments list. Exporting an active event is the way to carry its current state between browser sessions; local storage does not autosave unfinished events.

## Interaction and implementation

Opening Tournament focuses its h2 heading with `tabindex="-1"`. The status live region announces the current player and each completed turn or match. The bracket is a table with a caption and column-scoped headers. Native select, text inputs, buttons, textarea and dialog retain browser keyboard behavior.

The rules and validation are in `src/game/tournament/`; the event controller and storage hook are in the same directory. `TournamentScreen.tsx` composes the setup, active bracket, history and JSON panel. `Game.tsx` switches screens and pauses the hidden solo clock. `use-game.ts` supports disabling preference persistence and best recording for tournament sessions. Browser journeys are in `tests/tournament.e2e.test.ts`; pure pairing, comparison, JSON and retention checks sit beside their tournament modules.
