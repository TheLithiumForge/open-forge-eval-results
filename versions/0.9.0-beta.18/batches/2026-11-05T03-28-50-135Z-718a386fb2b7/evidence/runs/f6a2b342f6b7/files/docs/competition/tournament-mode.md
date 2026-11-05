# Tournament mode

Tournament mode lets four or eight people play a local knockout bracket on one device. It reuses the card rules while keeping tournament state and completed tournament records separate from solo preferences.

## Entry and play

The Tournament button beside New Game opens the Tournament screen. The Players select offers 4 and 8. The visible name inputs are labeled Player 1 through Player 4 or Player 8. Accepted names are trimmed, interior whitespace is collapsed and text is normalized to NFC. Names must contain 2 to 20 Unicode code points and be unique without regard to case. The acceptance errors are `Use 2 to 20 characters.` and `Each name must be different.`

Seeds follow entry order. Four entrants open with seeds 1 vs 4, then 2 vs 3. Eight entrants open with 1 vs 8, 4 vs 5, 3 vs 6, then 2 vs 7. An eight-player bracket proceeds through Quarterfinal, Semifinal and Final; a four-player bracket begins with Semifinal. The active screen shows `Round: NAME` and `Now playing: NAME`.

The first person starts with Start turn. After that game, Next turn selects the other player; Start turn begins their game. Both games use the match's same board code. Next match advances after both results are recorded. Quarterfinals use 4x4 boards, semifinals use 6x6 and finals use 8x8. Every match in one event gets a distinct full board code.

The match winner is decided by fewer moves, then lower active elapsed time, then the higher entry seed (seed 1 has priority). The bracket table displays the round, local match number, deal code, both players, their moves and time, and the winner. Tournament completion displays `Champion: NAME` and Back to game. Returning clears the finished active view while keeping its archived result, so opening Tournament again shows setup and Past tournaments. Leaving an unfinished event opens a native confirmation dialog; Keep playing and Escape retain it, while Leave returns to solo play and discards the active event.

Tournament games use the same active-time and card transitions as solo games. Opening Tournament mode suspends the solo clock, and tournament turns do not change the saved solo size or best moves. The leave and replacement dialogs do not pause a visible started turn. There is no backend or account identity; imported tournament data is validated as a consistent record, not authenticated as proof of play.

## Past tournaments and exchange

Completed tournaments appear newest first under Past tournaments. Expand a past entry to inspect its bracket and results. The `np3:tournaments` key stores a version 3 feature envelope with an `items` array and keeps the newest ten records. A blocked or failed store leaves the in-memory list usable and shows `Progress won't be saved on this device.` beside the list. Active tournaments are not written automatically.

Tournament JSON is a separate exchange format with root `format: "neon-pairs/tournament"` and numeric `version: 1`. Its object keys are written alphabetically. It carries entrants, board codes, match results, the current turn and the current game position. Import checks exact fields, names, board sizes, distinct deals, result bounds, progression and winner consistency before replacing the active tournament. Input is limited to 65,536 UTF-8 bytes. Unknown fields report `Unknown field: NAME.`; other rejected input reports `Invalid tournament JSON.`

Export tournament synchronizes the active clock before filling the Tournament JSON box. With no active event it exports the newest past tournament. With neither, it leaves the box empty and reports `Start or load a tournament before exporting.` Load tournament validates the box before replacing the event. Replacing an unfinished event asks for confirmation. A valid completed import is also added to the local past list.

## Source ownership

`src/game/tournament/rules.ts` owns names, turn progression, advancement and result comparison. `pairing.ts` defines round plans; `decode.ts`, `validation.ts` and `format.ts` own the exchange boundary. `use-tournament.ts` and `use-tournament-clock.ts` connect the pure decisions to browser state, fresh deals, timing and persistence. The components under `src/game/tournament` render setup, turns, the bracket, exchange tools and past records.

The feature follows [pairing](competition-pairing.md), [rounds](competition-rounds.md), [boards](competition-boards.md), [deals](competition-deals.md), [ties](competition-ties.md) and [score isolation](competition-scores.md). The complete journey is in [Acceptance](../quality/acceptance.md#tournament).
