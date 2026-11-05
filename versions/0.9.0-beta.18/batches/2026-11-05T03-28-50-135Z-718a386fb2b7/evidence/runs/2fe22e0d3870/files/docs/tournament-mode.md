# Tournament mode

Tournament mode lets four or eight people play a knockout bracket on one device. The Tournament button sits beside New Game. The card rules remain the same as solo play; the event owns its players, match order and results separately from ordinary preferences.

## Entering a tournament

Choose 4 or 8 in Players, enter the visible Player 1 through Player 4 or Player 8 fields, and select Start tournament. Accepted names are trimmed, inner whitespace is collapsed, and text is normalized to NFC. Each name must contain 2 to 20 Unicode code points, and names compare case-insensitively within the event. Invalid lengths report “Use 2 to 20 characters.” Repeated names report “Each name must be different.”

Seeds follow entry order. Four players open as 1 vs 4, then 2 vs 3. Eight players open as 1 vs 8, 4 vs 5, 3 vs 6, then 2 vs 7. Winners advance in bracket order: adjacent matches feed the next match. The round names and board sizes are Quarterfinal on 4x4, Semifinal on 6x6 and Final on 8x8. A four-player event begins at Semifinal.

Each match receives a distinct board code for the event. Its two players start fresh games from that same code, one after the other. A player starts with Start turn; after their completion, Next turn moves to the opponent, who uses Start turn for their game. Next match advances after both results are recorded. The bracket remains visible with each player's moves and active time.

## Match results and handoff

Fewer moves wins. Equal move counts are decided by lower active elapsed time; an exact tie goes to the higher seed, meaning the lower seed number. The comparison uses the recorded millisecond values and does not combine moves with time. The bracket displays time to microsecond precision.

Tournament games use the existing game rules and visible-page active clock. Opening Tournament suspends the solo clock while keeping the solo board in memory. Tournament turns do not change the saved solo size or best moves. A completed event displays “Champion: NAME” and is added to Past tournaments. Leave tournament asks for confirmation before discarding unfinished event progress. Returning from setup or a completed event uses Back to game.

## Past tournaments and storage

Finished events are stored locally in `np3:tournaments`, using the feature collection envelope `{ "items": [...], "v": 3 }`. The newest 10 events are retained. This history is separate from the existing preferences aggregate and is not synchronized to a service. If browser storage is unavailable, the current event still works and the screen says “Progress won't be saved on this device.”

Only completed tournaments are saved automatically. An in-progress tournament remains in page memory; Export tournament creates a portable copy when the group wants to preserve it. Loading a valid tournament replaces the current event, with confirmation when unfinished event progress would be replaced.

## Tournament JSON

Tournament JSON uses `format: "neon-pairs/tournament"` and numeric `version: 1`. Its object keys are written alphabetically at every level. The format represents setup drafts, an active bracket and its current game, or a completed bracket. A current game uses the existing snapshot validation rules and rounding at the embedded game-state boundary. Input is limited to 65,536 UTF-8 bytes and is validated before it replaces the screen state. Invalid input reports “Invalid tournament.” and keeps the current event and draft.

The JSON is editable and is not authenticated. Validation establishes a coherent bracket and plausible game results; it cannot establish who played or whether a supplied completed result was earned.

## Source boundaries

`src/game/tournament/` owns bracket data, tournament transitions, names, JSON exchange, announcements and presentation. The rules use `src/game/game.ts` for card actions and completion. Tournament browser time lives in `src/game/session/use-tournament-clock.ts`; saved history is isolated in `src/game/tournament/storage.ts`. Tournament turns do not pass through the ordinary preference-updating completion path.
