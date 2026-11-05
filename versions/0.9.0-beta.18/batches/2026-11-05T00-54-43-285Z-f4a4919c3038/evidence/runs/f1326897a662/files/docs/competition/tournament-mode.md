# Tournament mode

Tournament is a local knockout for four or eight people sharing one device. Open it with Tournament beside New Game, choose Players, enter the labelled player names and select Start tournament. The solo game is suspended while Tournament is open and restored by Back to game or a confirmed departure.

## Play and results

Entry order determines seeds and the opening matches in [Pairing](competition-pairing.md). Four players start with two Semifinals on 6x6 boards; eight players start with four Quarterfinals on 4x4 boards. Finals use 8x8. The screen shows Round and Now playing throughout the current match.

Start turn opens a fresh hidden game for the named player. Both players of a match receive the same board code. Every match has a distinct code within its tournament. Time starts with the first reveal and follows the ordinary active-time rules. Waiting for Start turn and the intervals between turns do not add time.

After the first player finishes, Next turn prepares the opponent's turn. After the second finishes, Next match prepares the next match. Fewer moves wins; equal moves compare exact active milliseconds, then the higher entry seed. Seed 1 has priority. The bracket table shows each player's moves and displayed time, and the match winner. Future opponents appear as To be decided until their feeder matches finish.

The final result shows Champion: NAME and Back to game. Tournament play never updates the ordinary preferred board size or best moves. The last ten finished tournaments are available under Past tournaments, newest first. View tournament opens a saved bracket for inspection and export. Leaving early does not save an unfinished tournament to that list.

## Input, focus and leaving

Names are trimmed, whitespace runs become one space, and text is normalized to NFC. Accepted names contain 2–20 Unicode code points and must differ without regard to case. Invalid entries show the messages from the [name length](../interface/name-length-policy.md) and [duplicate names](../interface/duplicate-names-policy.md) policies without replacing the setup.

Each replacement screen focuses its h2 with tabindex -1. All event announcements use the one existing polite, atomic region in Game.tsx. Result tables have captions and column headers. New controls have targets of at least 44 by 44 CSS pixels at a 390px viewport, and bracket overflow stays inside its own scroll area.

Leaving unfinished play, abandoning an active tournament, or replacing it with a valid import opens a native confirmation dialog. Keep playing receives initial focus; Keep playing and Escape preserve the current work. Leave commits the requested transition. Invalid imports never open this dialog or replace progress.

## Export and load

Every Tournament screen has Tournament JSON, Export tournament and Load tournament. Export fills the editable box with readable JSON; it uses no clipboard permission and does not pause play. Load validates the whole document before replacement. Invalid input leaves the draft and current tournament available. Unknown fields show Unknown field: NAME.

The version 1 document has exactly these keys, serialized alphabetically at every object level:

| Key          | Value                                                               |
| ------------ | ------------------------------------------------------------------- |
| `format`     | `neon-pairs/tournament`                                             |
| `setup`      | An object containing `count` (4 or 8) and `names` (eight strings)   |
| `snapshot`   | A version 1 snapshot JSON string during active play; otherwise null |
| `tournament` | The tournament object, or null for setup                            |
| `version`    | 1                                                                   |

A tournament has `currentMatch`, `matches`, `phase` and `players`. Each match contains `boardCode` and `results`; each result contains `elapsedMs` and `moves`. Participant seeds, round dimensions, future opponents and winners are derived from entry order and prior results. Phases are `ready`, `playing`, `turn-finished`, `match-finished` and `completed`. Validation checks their consistency, result ordering, numeric bounds, names and distinct correctly sized deals. Imports are limited to 1048576 UTF-8 bytes.

An active export includes the current player's progress using the existing snapshot precision. Loading it waits for Start turn before resuming the restored board. Stored completed results retain their exact active time for comparison. A completed import is added to history; importing the same deal collection again does not duplicate it.

## Storage and evidence

History uses `np3:tournaments` and exactly the envelope `{ "v": 3, "items": [...] }`. Reads validate every completed record. Corrupt data is silently treated as empty and stays untouched until the next save. Failed browser access or writes keep results in memory and show Progress won't be saved on this device. beside saved records. Ordinary preferences keep their existing key and format.

The pure rules are in `src/game/tournament/rules.ts`. The feature's nearby unit tests cover pairing, progression, comparisons, names, import validation, history retention and storage failures. Browser journeys in `tests/tournament*.e2e.test.ts` cover complete four- and eight-person brackets, same-deal handoffs, reload history, active export/load, leave confirmation, name errors and phone control targets. Ordinary game accessibility and lifecycle journeys continue to cover the shared board and clock. Spoken output remains user acceptance.
