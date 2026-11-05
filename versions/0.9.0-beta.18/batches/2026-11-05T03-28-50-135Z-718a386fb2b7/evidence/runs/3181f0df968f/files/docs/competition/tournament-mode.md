# Tournament mode

Tournament starts from the control beside New Game. Four or eight players enter distinct names. Entry order determines seeds and the opening bracket; see [pairing](competition-pairing.md). The group passes the device between players. Start turn opens a fresh game on the match's board code; Next turn hands the same deal to the opponent. Next match advances the winner. Board sizes, comparison and solo-record isolation follow [boards](competition-boards.md), [ties](competition-ties.md) and [scores](competition-scores.md).

Leaving unfinished play or replacing an unfinished tournament asks for confirmation. A completed tournament appears in Past tournaments on that device. The newest ten are kept in the `np3:tournaments` storage value using the version 3 feature envelope. If storage is blocked, the list remains available for the current visit and reports that it cannot be saved.

## Tournament JSON

Export tournament writes a readable JSON object with `format: "neon-pairs/tournament"`, `version: 1`, and `tournament`. A setup screen exports a null tournament. An event records normalized `names`, the ordered `matches`, the `current` match index, a `phase`, and a `snapshot`. Each match contains its board `code`, two player indices, two result slots, and a winner index. A result contains `moves` and active `elapsedMs`. Unfilled slots use null. An active game's snapshot is an encoded version 1 game snapshot in a string; other phases have a null snapshot. Exported object keys are alphabetical.

Load tournament validates the complete document before replacing the current event. It checks the bracket, deal sizes and uniqueness, result limits, winners, phase, and any active game snapshot. Unknown fields identify the first unrecognized name. Invalid input leaves the event and draft available. A restored game waits for Resume before play continues. Exported JSON is independent of saved tournament history and ordinary game preferences.
