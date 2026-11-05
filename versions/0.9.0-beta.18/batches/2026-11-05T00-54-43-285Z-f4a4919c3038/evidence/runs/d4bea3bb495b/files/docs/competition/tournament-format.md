---
open-forge:
  description: Tournament JSON version one, validation, precision and completed-history storage.
  tags: [Competition, Formats, Persistence]
---

# Tournament format

Tournament JSON copies setup, an active event or a finished event between visits. Export tournament fills the editable Tournament JSON box. Load tournament validates the complete text before replacing the displayed event. Failed loads preserve both play and the draft, with a visible notice published through the shared status region.

## Exchange object

The root has exactly `format`, `setup`, `tournament` and `version`. `format` is `neon-pairs/tournament`; `version` is the integer 1. Exactly one of `setup` and `tournament` is non-null. Object keys are alphabetical at every level. The inclusive input limit is 262144 UTF-8 bytes.

- `setup` contains exactly `count` (4 or 8) and `names` (that many strings). Names have normalized representation; unfinished entries may be empty or fail the start-time length and uniqueness checks.
- `tournament` contains exactly `currentMatch`, `game`, `matches`, `names` and `phase`. Names are normalized, valid and unique. Player indices follow entry order, starting at zero.
- `matches` has one fewer entry than players, in round order. Each match contains exactly `boardCode`, `players`, `results` and `winner`. Later rounds gain participants as the preceding matches finish. Results have exactly `elapsedMs` and `moves`; their array order matches `players`. `winner` is a player index or null until both results exist.
- `currentMatch` indexes the current match. `phase` is `ready`, `playing`, `turnComplete`, `matchComplete` or `complete`. `game` is a [version 1 snapshot](../sharing/snapshot-format.md) on that match's board code, with the tournament format's alphabetical key order.

Results keep finite active milliseconds, including fractions, for [tie comparison](competition-ties.md). The embedded snapshot uses the existing whole-millisecond export rules. Loading active progress waits for Start turn and retains the exported snapshot's remaining mismatch interval. A completed current game must agree with the last recorded result's moves and floored elapsed milliseconds.

Validation reconstructs the seeded bracket and its advancement, checks each stage's board dimensions and unique codes, verifies every recorded winner and participant, and rejects future results or inconsistent phases. Result bounds follow the game's move and elapsed caps and minimum completed moves. Unknown keys at any object boundary show `Unknown field: NAME.`; other failures show `Invalid tournament.`. No claimed play history is authenticated.

## Completed history

The new browser key is `np3:tournaments`. Its value has exactly `v: 3` and `items`, an array of completed exchange objects, newest first. Saving retains the newest ten distinct events; loading the same completed document again does not duplicate it. Finishing play and importing a completed event save history. Reading corrupt storage treats it as empty without changing the stored string. A later save can replace it.

Storage access and write failures preserve in-memory play and history. The existing `neon-pairs.preferences.v1` key, saved size and solo bests are unaffected by tournament games. Exporting and importing do not use the Clipboard API, a backend or additional assets.

The implementation is in `src/game/tournament/format.ts`, `validation.ts`, `storage.ts` and `session/use-tournament.ts`. Focused format and storage tests sit beside them; application journeys cover reload, handoff and imported pause behavior.
