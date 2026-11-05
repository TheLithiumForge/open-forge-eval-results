# Tournament JSON

This page describes version 1 Tournament JSON, its validation boundary and the local list of finished events.

The Tournament screen always has an Export tournament button and a Tournament JSON text area. Export writes the current setup draft, active event or finished record into that area. Load tournament reads the area back into the screen. An accepted import replaces the current tournament view; a rejected import leaves it and the text draft available.

## Three document states

Every document is a JSON object with numeric `version: 1` and a `status` discriminator. The reader accepts exactly the fields for that status.

| Status     | Other root fields                                             | Meaning                                                                                                       |
| ---------- | ------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| `setup`    | `playerCount`, `names`                                        | A four- or eight-entry setup draft. Names remain drafts until Start tournament validates and normalizes them. |
| `active`   | `startedAtMs`, `players`, `rounds`, `current`, `gameSnapshot` | A tournament that can continue from the current player and game position.                                     |
| `finished` | `record`                                                      | A completed bracket with all individual results and its champion.                                             |

The active document's `current` object has `roundIndex`, `matchIndex`, `turnIndex` and `phase`. Active phases are `ready`, `playing`, `nextTurn` and `nextMatch`. `gameSnapshot` is a version 1 game snapshot for the current match's board code. The game snapshot carries current card progress; the surrounding Tournament fields carry the participants, match results and event position.

The nested forms are:

```json
{
  "seed": 1,
  "name": "Ada"
}
```

```json
{
  "boardCode": "np1-6-73",
  "players": [1, 4],
  "results": [
    { "moves": 18, "elapsedMs": 70123.5 },
    { "moves": 19, "elapsedMs": 61200 }
  ],
  "winnerSeed": 1
}
```

An unassigned player or result is represented by JSON `null`. A match's winner is derived from its results: fewer moves wins; equal moves use lower active elapsed time; exact equality uses the higher-ranked seed (the lower seed number). Moves are integers and elapsed time is milliseconds. The seven or three matches in an event use the round names and board sizes in [Competition rounds](competition-rounds.md) and [Competition boards](competition-boards.md).

## Validation before replacement

The import limit is 262,144 UTF-8 bytes. Roots and nested objects use exact field sets. The reader checks player count, normalized unique names, entry-order seeds, the specified opening pairings, stage names and sizes, unique full board codes, result bounds, winner consistency and bracket advancement. An active import also decodes its game snapshot and checks that its code and completion state agree with the current match and phase.

Unknown fields, unsupported versions, inconsistent results, malformed JSON and invalid snapshots are rejected with `Invalid tournament JSON.` The decoder constructs accepted tournament data from validated fields rather than merging the parsed object into React state. The format has no authentication or signature: an edited document can still describe a structurally consistent event, so it is a portable bracket record rather than proof of who played.

Names use the representation and length rules in [Text entry](../interface/text-entry-policy.md), [Name length](../interface/name-length-policy.md) and [Duplicate names](../interface/duplicate-names-policy.md). Draft exports can contain unfinished names; Start tournament is the acceptance boundary.

## Local finished-event history

Only completed tournaments enter Past tournaments. The collection is saved at `neon-pairs.tournaments.v1` in the feature envelope `{ "v": 3, "items": [...] }`. It retains the newest ten finished records, following [Retention policy](../persistence/retention-policy.md). A browser storage write failure leaves the completed record visible for the current page and displays a notice.

Active tournaments are not automatically saved on reload. Export and Load tournament provide the explicit continuation path. The history and exported document remain separate from `neon-pairs.preferences.v1`: Tournament games never change the ordinary selected size or best moves.

Tournament JSON is separate from board codes, snapshots and replays. Its `version: 1` describes the tournament document fields and does not change the existing game interchange formats or their versions. See [Format versioning](../sharing/format-versioning-guide.md).
