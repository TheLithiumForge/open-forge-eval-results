---
open-forge:
  description: Tournament screens, handoffs, bracket results, JSON exchange and completed-event storage.
  tags: [Competition, Interface, Formats, Persistence]
---

# Tournament mode

Tournament mode extends the solo 2.2 game for 4 or 8 people sharing one device. It uses the existing card rules, active clock, keyboard navigation and offline distribution.

## Setup and play

Tournament sits beside New Game. Its setup has a Players select for 4 or 8, inputs labelled Player 1 through the selected count, and Start tournament. Accepted names follow the [representation](../interface/text-entry-policy.md), [length](../interface/name-length-policy.md) and [duplicate](../interface/duplicate-names-policy.md) policies.

Entry order establishes seeds and [opening pairings](competition-pairing.md). Each match has one unique board code, used by both players. [Rounds](competition-rounds.md) and [board sizes](competition-boards.md) determine the displayed stage and deal dimensions. Fewer moves wins; [ties](competition-ties.md) compare precise active milliseconds, then original seed, with seed 1 highest.

Show Round: NAME and Now playing: NAME during the event. Start turn reveals the playable board. Its clock starts at the first valid card activation. A completed first game offers Next turn, which prepares the other player's fresh game on that same deal. A completed match offers Next match. Winners advance into the next round, and the final result shows Champion: NAME and Back to game.

The bracket is a captioned table with match, round, player, moves, time and winner columns. Future opponents are described by their preceding match. Every completed turn remains in the bracket. Displayed times use the ordinary minutes-and-seconds formatter; comparisons retain the underlying precision.

Tournament play does not change ordinary best scores or the selected solo size. The ordinary game stays in memory while Tournament is open, with its clock suspended, and is available on return.

## Leaving, focus and feedback

Leaving an unfinished tournament, replacing it through import, or opening Tournament from started solo play asks in a native dialog. Keep playing receives focus. Escape keeps playing. Leave commits the requested navigation. Opening the dialog preserves the current clock behavior; it does not add a pause.

Each screen transition focuses the main screen's h2 with tabindex -1. All event feedback uses the one polite, atomic status paragraph in Game.tsx. Clock ticks, focus movement and mismatch closure remain quiet. Controls follow the [target size policy](../interface/target-size-policy.md).

## JSON exchange

Every Tournament screen has Export tournament, a Tournament JSON textarea and Load tournament. Export synchronizes active time before filling the editable box. It needs no clipboard permission. The format has exactly these root fields, with keys alphabetically ordered at every object level:

```json
{
  "format": "neon-pairs/tournament",
  "game": null,
  "tournament": null,
  "version": 1
}
```

Null game and tournament identify an empty setup. A running or completed event supplies both objects. Setup form drafts are not part of the exchange format.

The tournament object has exactly matchIndex, matches, phase, players and turn. Player references and turn are zero-based indices; original entry positions establish seeds. Phases are ready, playing, turn-complete, match-complete and complete. Each match has exactly boardCode, players, results, round, size and winner. Unresolved player and winner references are null. The two result slots hold null or objects with exactly elapsedMs and moves.

The game object has the existing snapshot fields, including version 1, but tournament exchange retains fractional elapsedMs and mismatch remainingMs. This precision belongs to this new format; the existing snapshot format is unchanged. The deck is regenerated from boardCode. No hidden deck or browser focus state is serialized.

Imports are limited to 131072 UTF-8 bytes. Validate exact keys, version, names, stage sizes, distinct deal codes, seeded participants, chronological results, score bounds, derived winners and current-game consistency before replacement. Unknown fields show Unknown field: NAME. Other failures show Invalid tournament. A rejected load retains the current event and text draft.

A loaded playing turn becomes ready without losing its progress, elapsed time or pending mismatch. Start turn continues it. Completed imports stay completed, without a celebration, and join the saved history. Loading an earlier result screen preserves its Next turn or Next match action.

## Saved history

Completed tournaments are saved newest first under np3:tournaments. The storage value has exactly v, the number 3, and items, an array of tournament export objects. Save retains the newest 10 distinct records. Viewing a past event does not reorder history. Reload returns to the ordinary game; opening Tournament exposes the saved list.

An invalid stored collection is silently treated as empty and remains untouched until the next completed-event save. Failed storage access or writes keep records in memory and show Progress won't be saved on this device. beside Past tournaments. Other storage keys are untouched. Unfinished events require explicit export to survive reload.

## Implementation and checks

Pure bracket transitions live in src/game/tournament/rules.ts, with adjacent rules, format and storage tests. The session hooks own clock integration, deal selection and browser persistence. Tournament components render setup, results and exchange controls. Browser journeys cover both complete bracket sizes, reloads, identical match deals, ordinary preference isolation, name validation, imported progress, leave cancellation, phone targets and blocked storage.
