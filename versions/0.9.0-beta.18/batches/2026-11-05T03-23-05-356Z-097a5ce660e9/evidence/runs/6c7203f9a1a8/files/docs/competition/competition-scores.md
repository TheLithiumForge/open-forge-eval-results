---
open-forge:
  description: Competition isolation from ordinary saved size and best moves,
    including the current session write paths.
  tags:
    - Competition
    - Persistence
    - Scores
---

# Competition results and local records

This page explains the boundary between competition play and the ordinary saved preferences in Neon Pairs.

The solo application stores a preferred board size and best move counts by size. Those values describe ordinary use of the device, rather than named participants. Tournament uses a separate session while reusing the game core, so its results do not change those preferences.

## The competition boundary

A shared device may already contain records from someone who is not taking part in the event. Tournament games never change best scores or the saved board size. This separates the event's results from the device's ordinary play preferences without changing the meaning of a completed memory board.

For example, suppose the saved size is 10 and the saved best for size 4 is 12 moves. A competition attempt can produce a completed four-column board with 8 moves while those ordinary saved values remain size 10 and best 12. The game result and the preference record describe different things; the competition boundary prevents one from being substituted for the other.

The comparison between participants is in [competition ties](competition-ties.md). Competition adds no extra points, multiplier or group total. In the existing core, progress is the number of matched pairs, and a completed game also has its move count and elapsed time.

## What the game saves today

`src/game/session/storage.ts` defines `Preferences` with a numeric `size` and a `bestMoves` map keyed by size strings. `PREFERENCES_KEY` is `neon-pairs.preferences.v1`. `writePreferences` serializes a schema version together with those values.

An example stored value is:

```json
{
  "schemaVersion": 1,
  "size": 10,
  "bestMoves": {
    "4": 12,
    "6": 24
  }
}
```

There are no participant names or board codes in that value. A best belongs to a board size across ordinary games, rather than to a particular generated deal. Tournament results live in a separate history key and are not folded into this map.

The reader validates the schema version, supported size and best-score map. Score keys have to represent supported sizes in canonical numeric-string form. Values are nonnegative safe integers within the move cap and at least the number of pairs for that size. An invalid record falls back to default preferences rather than being partly interpreted as an event history.

[Preferences store](../persistence/preferences-store.md) and [best score records](../gameplay/best-score-records.md) explain the ordinary mechanism. Tournament history has its own `np3:tournaments` key and v3 `{v, items}` envelope; [Persistence overview](../persistence/persistence-overview.md) describes it.

## Two ordinary paths have side effects

The first path is game replacement. `replaceGame` in `src/game/session/session.ts` copies preferences and assigns `size: game.size`. The ordinary browser actions for starting a new deal, restarting and successfully loading a board or snapshot use that replacement function. Its purpose is to keep solo play's chosen size in sync with the current game.

The second path is completion. `activateSession` calls `activateCard`, recognizes a won game and calls `rememberBest(session.preferences, game.size, game.moves)`. That helper compares the new moves with the previous entry for the size. A better value produces a new map, while an equal or worse value returns the original preference object.

Both behaviors remain correct in the solo context. Tournament avoids those paths: `useTournament` creates games from match board codes and records its own results. It does not call `replaceGame` or `rememberBest`.

`Game.tsx` keeps the solo `useGame` controller mounted while switching screens and passes whether the Play screen is active to its clock. The tournament controller does not change the solo session's game or preferences. These boundaries preserve both the current solo result and selected size.

## Where saving actually happens

`useGame` reads preferences at initialization and calls `useSavedPreferences(store, session.preferences)`. That hook has an effect that invokes `writePreferences` whenever the preference object or store dependency changes. It also runs when mounted.

Consequently, hiding the Best statistic would not prevent saved records from changing in a controller that still calls the ordinary completion transition. Tournament isolation comes from its separate transition and controller, not from presentation. The display does not own the write.

The distinction between values and writes is useful here. The competition sentence concerns the best-score and size values. It does not itself introduce a blanket prohibition on all storage API calls. A review that counts only writes can miss an in-memory change; a review that looks only at the current screen can miss a persisted change after reload.

`rememberBest` returning the original object for equal or worse ordinary results can reduce preference effect activity. That identity behavior is an implementation detail with a clear purpose, but it is not a substitute for deciding which context owns a completion. [Persistence overview](../persistence/persistence-overview.md) and [React boundaries](../architecture/react-boundaries.md) cover those existing responsibilities.

## Why completed snapshot import is a partial analogy

The current solo application already treats imported completion differently from completion through card activation. `replaceGame(session, game, true)` sets the imported state without calling `rememberBest`. A completed snapshot arrives with its banner static and without a celebration. An unfinished imported game can later be resumed and completed through ordinary activation, which can record a best.

That existing distinction is helpful evidence that rendering a won board and recording a local best are separate operations. Tournament completion likewise records a match result without calling the solo best-score transition.

`src/game/session/session.test.ts` checks those differences. It verifies that normal completion records a best, completed import does not, and finishing restored incomplete progress can record one. Reading the full set of assertions prevents an engineer from generalizing the completed-import exception to every game associated with a snapshot.

## A concrete review example

Begin with the saved value shown above and a tournament board at size 4. Complete one tournament turn, then return to Play. Neither the selected size nor the size-4 best changes; the completed result appears in the bracket and, after the event, in tournament history.

The boundary for competition preserves the original values through both moments. This example exposes both source paths with a small amount of data. It is more informative than starting from empty preferences, because an empty map makes an accidental new best look like an ordinary first result.

A further comparison with ordinary solo play matters when reviewing an implementation. The existing solo behavior still provides the baseline: `tests/persistence-contract.e2e.test.ts` exercises better, equal and worse completed results across reloads, as well as successful and unsuccessful load effects on saved size. Those tests describe the current game; they do not exercise a competition screen.

The useful evidence is the before-and-after preference content alongside the completed game, with the active context made clear.
