---
open-forge:
  description: Tournament flow, local history and the tournament exchange format
  tags: [Competition, Persistence, Formats]
---

# Tournament mode

Tournament mode lets four or eight people play a seeded knockout on one device. Open it with Tournament beside New Game. Enter each player's name and select Start tournament. The bracket shows all matches, results and winners. Each player starts their own turn, and both players in a match receive the same deal. Next turn and Next match advance the event; Leave tournament asks before discarding an unfinished event.

[Pairing](competition-pairing.md), [boards](competition-boards.md), [deals](competition-deals.md) and [ties](competition-ties.md) define the bracket rules. Tournament games do not change the solo size or best scores.

A completed or imported completed tournament is saved in Past tournaments, newest first, up to ten. Identical imported records are kept once. Browser storage uses `np3:tournaments` with the envelope `{ "v": 3, "items": [...] }`. If storage is unavailable, play continues in memory and the history area explains that progress will not be saved. Active tournaments are not saved automatically.

Export tournament fills Tournament JSON with a version 1 `neon-pairs/tournament` object. Its alphabetically ordered keys are `format`, `snapshot`, `tournament`, and `version`. The tournament contains normalized `names`, ordered `matches`, and a `phase`; a match contains its `boardCode`, two zero-based player seeds, their results, and a winner seed or null. A result contains `elapsedMs` and `moves`. The `snapshot` is a version 1 game snapshot encoded as a JSON string for an active turn, and null otherwise. A setup screen has a null tournament and snapshot. Loading validates the complete event and any snapshot before replacing the current state. An imported active turn waits for Resume.
