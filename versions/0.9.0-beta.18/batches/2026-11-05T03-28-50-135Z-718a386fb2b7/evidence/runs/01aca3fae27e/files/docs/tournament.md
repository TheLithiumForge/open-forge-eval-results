# Tournament mode

Tournament is a local knockout for four or eight people sharing a device. Entry order supplies seeds. The opening matches are 1–4 and 2–3 for four players, or 1–8, 4–5, 3–6 and 2–7 for eight. Each match uses one board code for both players, and every match in the event has a different code. Quarterfinals use 4x4 boards, semifinals 6x6 and the final 8x8.

Each player starts their turn separately. Fewer moves wins; equal moves are decided by lower active elapsed time, then by the higher seed. The bracket records each player's result and the winner. Tournament games do not change the ordinary board size or best scores.

Finished brackets are saved locally under `np3:tournaments` as an object with `v: 3` and an `items` array. A save keeps the newest ten. Blocked storage leaves the list available in memory during the visit and displays a warning. Invalid stored data is ignored until a later save replaces it.

Tournament JSON is an interchange object with `format: "neon-pairs/tournament"`, `version: 1`, `tournament`, and `snapshot`. The tournament contains names, the current match index, and ordered matches with board codes, participant indices, results and winners. The snapshot is null between turns or contains the existing version 1 game snapshot for the current unfinished turn. Loading such a turn pauses it until Resume. The importer checks the bracket, results, deal sizes, uniqueness and snapshot before replacing the current event. An empty tournament screen exports a null tournament and snapshot.
