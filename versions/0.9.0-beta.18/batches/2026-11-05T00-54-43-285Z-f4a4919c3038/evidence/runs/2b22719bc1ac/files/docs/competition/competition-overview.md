---
open-forge:
  description: Purpose and social context of shared-device competition, with an
    honest boundary around the solo implementation.
  tags:
    - Competition
    - Product
    - Architecture
---

# Tournament mode

Tournament mode lets four or eight people play a knockout event on one device. Each match compares two complete attempts on the same deal. It runs locally, without accounts or a service.

## Entry and handoff

- K01 - Put Tournament next to New Game. It opens the Tournament screen. Label the native entrant-count select Players, with 4 and 8 as its options. Label the name inputs Player 1 through the selected count. Start tournament accepts the group and opens its first match.
- K02 - Process names using [text entry](../interface/text-entry-policy.md), [length](../interface/name-length-policy.md) and [duplicate name](../interface/duplicate-names-policy.md) policies. Seeds follow entry order. Use the opening opponents and order in [pairing](competition-pairing.md).
- K03 - Show Round: NAME and Now playing: NAME. Each player selects Start turn before their board becomes available. After the first completed attempt, show Next turn. It opens the second player's waiting screen. After both attempts, show Next match to open the following match's waiting screen. The final result opens the champion screen.
- K04 - Both players begin with fresh progress on the match's one board code. Every match has a distinct code. Use the existing engine, artwork, keyboard behavior and active clock. [Boards](competition-boards.md) defines stage sizes; [rounds](competition-rounds.md) defines their names; [deals](competition-deals.md) defines identity.

## Results and departure

- K05 - Fewer moves wins. Equal moves compare exact active elapsed milliseconds; equal times favor the higher seed (seed 1 is highest). See [ties](competition-ties.md). Advance winners from adjacent matches into the next round.
- K06 - Show every bracket match in a table with a caption and column headers. Include round, participants, each participant's moves and time, and the winner. Future participants and unfinished values remain visibly pending. Show Champion: NAME after the final and a Back to game button.
- K07 - Leave tournament is available throughout an unfinished event. Confirm abandonment using the native dialog and Keep playing / Leave choices in [dialog policy](../interface/dialog-policy.md). Escape keeps playing. Opening Tournament from unfinished solo play also confirms departure. Returning to solo play starts a fresh deal at the ordinary saved size. Tournament games never change ordinary size or best records, as [scores](competition-scores.md) requires.
- K08 - Focus each replacement screen's h2 with tabindex=-1. Keep one polite, atomic event region in Game.tsx for handoffs, turn results, imports and completion. Repeated identical events have distinct publication identities. New controls meet the 44-pixel target policy at a 390-pixel viewport.

## History

- K09 - Save finished events, including accepted completed imports, in newest-save order. Show them in Past tournaments on the Tournament entry screen after reload. Opening a record shows its bracket and champion. Keep the newest ten. Use key np3:tournaments with exactly `{ "v": 3, "items": [...] }`. Validate the whole stored collection; silently treat invalid data as empty without writing during the read. A later save replaces it. On blocked reads or writes, retain in-memory play and show “Progress won't be saved on this device.” beside the history or event. Unfinished events remain in memory unless explicitly exported.

## Tournament JSON

- K10 - Every Tournament screen has Export tournament, Load tournament and a labelled Tournament JSON textarea. Export fills it with readable JSON for manual copying. Loading validates the complete draft before replacing the current screen. Rejection preserves play and the draft. Valid replacement of unfinished work asks for confirmation. Active imported play waits for Start turn before accepting cards or accumulating time.

The version 1 exchange object has exactly these keys, alphabetically ordered at every object level:

| Key        | Meaning                                                                        |
| ---------- | ------------------------------------------------------------------------------ |
| format     | `neon-pairs/tournament`                                                        |
| names      | Four or eight setup names, or the event's accepted names                       |
| snapshot   | A version 1 game snapshot object only during an active attempt; otherwise null |
| tournament | The event object below, or null for setup                                      |
| version    | 1                                                                              |

The event object has exactly matchIndex, matches, phase and players. Players is the accepted name array; indices into it are zero-based seeds. Matches contains every event match in round order, with exactly boardCode, players, results and winner. Match players are their entrant indices, results are in play order, and winner is an entrant index or null. Each result has exactly elapsedMs and moves. Results retain fractional elapsed milliseconds for tie comparison. Snapshot precision follows the existing integer-millisecond format.

Phase is ready, playing, turnDone, matchDone or complete. MatchIndex identifies the current match until Next match advances it. The decoder reconstructs advancement from results and validates pairings, stage sizes, unique codes, winner identities, phase, result bounds and any active snapshot's code and state. It rejects unknown fields with Unknown field: NAME. Other rejected documents show Invalid tournament. The text boundary is 65536 UTF-8 bytes; the textarea also limits entry to 65536 characters. Setup drafts may be incomplete; starting an event still enforces name acceptance.

## Implementation and evidence

Pure event transitions live in src/game/tournament/rules.ts, with focused tests beside them. The feature's components, validation, exchange and history modules live in the same directory. The tournament attempt adapter in src/game/session/use-tournament-turn.ts reuses the ordinary session clock and card feedback without saving preferences. Game.tsx selects the screen and owns the sole live region and leave confirmation.

Complete four- and eight-player browser journeys exercise real games, handoffs, a champion, bracket history after reload and unchanged solo preferences. Import journeys cover rejected drafts, confirmed departure and paused restoration. Pure tests cover seeding, stages, move/time/seed comparison, name processing, format rejection and storage retention/failure. Browser tree evidence does not establish spoken screen-reader output; that remains user acceptance.

[Competition research](competition-research.md) discusses physical device handoff and spectating. Local codes and JSON reproduce game data; they do not attest who played or whether someone watched another attempt.
