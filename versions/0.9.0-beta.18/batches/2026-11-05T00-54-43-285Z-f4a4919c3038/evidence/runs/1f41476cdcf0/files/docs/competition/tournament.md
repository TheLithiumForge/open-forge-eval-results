# Tournament mode

Tournament is a local knockout for four or eight players sharing one device. The Tournament button beside New Game opens setup. Choose Players, enter Player 1 through Player 4 or Player 8, and select Start tournament. Names follow the linked text-entry, length and duplicate policies: normalize to NFC, trim and collapse whitespace, accept 2–20 Unicode code points, and reject repeats without regard to case.

Entry order supplies seeds. Four players open with 1–4 and 2–3; eight open with 1–8, 4–5, 3–6 and 2–7. Winners of adjacent matches meet in the next round. Quarterfinals use 4x4, semifinals 6x6 and finals 8x8. Four players begin at Semifinal. During play the screen shows Round: NAME and Now playing: NAME.

Each match has a distinct board code, shared by its two players. Start turn reveals that player's fresh board; active time starts at the first card reveal. Both turns must finish. Next turn hands the device to the second player, and Next match advances after both results. Fewer moves wins, then lower active elapsed milliseconds, then higher seed (seed 1 first). Comparison retains fractional milliseconds in completed results. Tournament play never changes ordinary best scores or the saved grid size. The solo board remains in memory with its clock suspended while Tournament is open.

The bracket is a captioned table showing each match, its players, moves, active time and winner. Undetermined slots are marked To be decided. The final result shows Champion: NAME and Back to game. Tournament screen returns from a completed result to setup and history. Leave tournament confirms abandoning an unfinished event with a native dialog: Keep playing initially has focus, Escape continues, and Leave returns to setup. Opening Tournament during unfinished solo play also asks first. Screen replacements focus their h2 with tabindex -1. Event feedback uses the single persistent polite, atomic status region in Game.tsx.

## History

Completed tournaments, including loaded completed tournaments, are saved newest first under `np3:tournaments`. The value has exactly `{ "v": 3, "items": [...] }`. It retains ten records; loading the same completed record again does not duplicate it. Past tournaments on setup opens a saved bracket. Active tournaments stay in memory until explicitly exported. Reload starts the ordinary game and leaves finished history available from Tournament.

Reads validate the whole collection. Corrupt data is treated as empty silently and left untouched until a later completion saves. Acquisition, read and write failures leave play working in memory; setup's history area displays "Progress won't be saved on this device." Unrelated storage and the existing preference format are untouched.

## Tournament JSON version 1

Every Tournament screen includes Export tournament, Load tournament and a Tournament JSON textarea. Export produces readable JSON with alphabetically ordered keys at every level. The root has exactly these fields:

| Field        | Value                                                                       |
| ------------ | --------------------------------------------------------------------------- |
| `format`     | `"neon-pairs/tournament"`                                                   |
| `version`    | `1`                                                                         |
| `setup`      | `{ "count": 4 or 8, "names": [eight draft strings] }`                       |
| `tournament` | A tournament record, or `null` for setup                                    |
| `snapshot`   | An existing version 1 game snapshot during an active turn, otherwise `null` |

A tournament record has exactly `matchIndex`, `matches`, `phase`, `players` and `turn`. Players are normalized names in entry order; `turn` is 0 or 1. Matches are in round order, with exactly `boardCode` and `results`. Results are zero, one or two objects with exactly `elapsedMs` and `moves`, in player order. Participants and winners are derived from seeds and previous results rather than trusted imported fields.

The phase is `ready`, `playing`, `turn-complete`, `match-complete` or `complete`. Earlier matches must have two results, later matches none, and the current match's result count must agree with the phase and turn. Only the final second result can be complete. Codes must be unique and have the required round sizes. Results must respect the game's move minimum and move/time caps. Player counts, names, all nested shapes and the active snapshot's board identity are validated before replacement.

Imports accept up to 262144 UTF-8 bytes. Unknown fields show "Unknown field: NAME."; other failures show "Invalid tournament." Failed loads preserve the edited JSON and existing play. A valid replacement of an unfinished tournament asks through the same leave dialog. Loading an active turn preserves progress but waits for Start turn to continue. Embedded snapshots retain their existing integer-millisecond serialization; completed tournament results preserve full recorded precision. Exporting setup also preserves unfinished name drafts without starting an event.

## Implementation and evidence

Pure decisions live in `src/game/tournament/rules.ts`; validation and exchange functions are beside them. The browser controller lives in `src/game/session/use-tournament.ts`, reusing the session clock and card transitions while disabling ordinary record updates. Fresh deal input remains owned by `session/fresh-board.ts`.

Colocated rule and format tests cover pairings, stage boards, advancement, score comparison, names, import consistency, retention and storage failures. `tests/tournament.e2e.test.ts` covers full four- and eight-player events, shared deals, history after reload, JSON exchange, active restoration, focus, leave confirmation, phone targets and denied storage. Existing solo browser journeys remain regression evidence. Spoken screen-reader behavior remains user acceptance.
