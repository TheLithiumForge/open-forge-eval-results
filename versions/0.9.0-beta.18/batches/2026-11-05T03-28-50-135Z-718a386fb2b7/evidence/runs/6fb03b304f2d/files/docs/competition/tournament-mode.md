# Tournament mode

Tournament mode brings four or eight people together on one device. Open it with Tournament beside New Game. Enter each player's name and select Start tournament. Names are trimmed, normalized to NFC and have internal whitespace collapsed. They must contain 2 to 20 Unicode code points and be distinct without regard to case.

Entry order supplies the seeds and the opening pairings described in [Competition pairing](competition-pairing.md). Each match uses one unique board code for both players. Quarterfinals use 4x4, semifinals 6x6 and the final 8x8. Start turn begins a fresh attempt on that match's deal. Next turn hands the same deal to the other player; Next match advances the bracket. Fewer moves wins, followed by lower active elapsed time, followed by the higher entry seed. Tournament attempts do not change solo size or best scores.

Leave tournament asks for confirmation while a tournament is unfinished. A finished event or a loaded finished event is added to Past tournaments on this device, keeping the newest 10. Storage failure leaves play available in memory and displays a notice. The active event is not automatically saved across reloads; export it to preserve progress.

## Exchange

Export tournament writes readable JSON to Tournament JSON. Load tournament validates the whole text before replacing the current event. An unfinished current event requires confirmation before replacement. A failed load keeps the current event and draft.

The version 1 exchange object has `format: "neon-pairs/tournament"`, `version: 1`, `tournament` and `snapshot` keys, alphabetically ordered in exports. A tournament contains `names`, `matches`, `current` (the zero-based current match index), and `phase`. Matches contain the board `code`, two zero-based player indices in `players`, two `scores`, and a `winner` index. A score contains `moves` and `elapsedMs`; unavailable players, scores and winners are null. Phases are `ready`, `playing`, `turnComplete`, `matchComplete` and `complete`. A playing exchange includes the current game's version 1 snapshot as a JSON string; other phases use null. An empty setup exports null for both tournament and snapshot.

Loading checks names, pairings, unique codes, stage sizes, score bounds, winner calculations, progression and the active snapshot before accepting data. Unknown fields are reported by name. Exported elapsed scores keep the active clock's fractional millisecond precision; an active snapshot follows the existing snapshot format's millisecond precision. Like other local exports, this format does not prove who played a game.
