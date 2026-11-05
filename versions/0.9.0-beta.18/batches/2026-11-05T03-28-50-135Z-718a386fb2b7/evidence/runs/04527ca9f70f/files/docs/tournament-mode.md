# Tournament mode

Tournament mode is a shared-device knockout event. It keeps participant, match and result data outside ordinary solo preferences while reusing the existing board rules and active clock.

## Set up and pair players

Choose 4 or 8 players. The screen provides fields labelled Player 1 through Player 8; only the chosen number is enabled. Names are trimmed, internal whitespace is collapsed, and text is normalized to NFC when accepted. Each name must have 2 to 20 Unicode code points. Names compare without regard to case within this tournament.

Entry order assigns seeds. Four players open as seed 1 versus 4, then 2 versus 3. Eight players open as 1 versus 8, 4 versus 5, 3 versus 6, then 2 versus 7. Winners advance along those pairings to the Semifinal and Final. A four-player bracket begins at the Semifinal.

Quarterfinals use 4x4 boards, Semifinals use 6x6 boards and Finals use 8x8 boards. Every match receives a unique full board code within the event. Both players in a match start fresh games from that same code, one after the other. The Start turn action begins each attempt; Next turn hands the same deal to the other player. Next match moves to the following bracket match after both results exist. Leave tournament asks for confirmation before discarding an unfinished event and pauses active time until the choice is made.

The shared status shows `Round: NAME` and `Now playing: NAME` during a turn. Once a game ends it identifies who is next; after both results it identifies the match winner. The champion appears at the end.

## Results and game boundary

Fewer moves wins a match. Equal move counts use lower active elapsed time; if those values are exactly equal, the lower seed wins. Elapsed comparisons use the in-memory millisecond values, including fractions. The bracket displays each player's moves and formatted time, with the match winner identified in its own column. At the end, the screen shows `Champion: NAME`.

Tournament games use the normal matching, mismatch and active-time rules. They never change the solo saved size or per-size best moves. Tournament play uses its own React state and clock adapter; it does not call the solo completion path.

## Tournament JSON

The Tournament JSON field accepts a versioned `neon-pairs/tournament` object. Export writes alphabetized keys and includes the bracket, deal codes, completed results and an in-progress game snapshot when there is one. Exporting a setup screen preserves the selected player count and name drafts. Loading validates the complete value before replacing the tournament or setup. A valid load that would replace an active event asks for confirmation first. Unknown fields show `Unknown field: NAME.`; other rejected values show `Invalid tournament.`. A loaded in-progress turn waits for Start turn before active time or card actions resume.

The export is copyable text. It uses no clipboard API or network service. Tournament JSON is separate from board codes, game snapshots and browser storage.

## Past tournaments and storage

Finished tournaments are added to Past tournaments with their players, champion and match count, and remain there after reload. The newest 10 records are retained. They use the feature envelope `{ "v": 3, "items": [...] }` at `np3:tournaments`; the existing preferences key stays unchanged. Active tournament progress remains in memory and is not saved to browser storage; Export puts JSON in the field for manual transfer. If browser storage is unavailable, the current event still works and the screen says `Progress won't be saved on this device.`

The browser has no account service or remote tournament results. Imported JSON is validated for plausible structure and game consistency, but it does not prove who played or certify a result.
