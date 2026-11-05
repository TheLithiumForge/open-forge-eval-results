# Tournament mode

Tournament is a local, shared-device knockout for four or eight players. Entry order sets the seeds and opening pairings. Each match uses one board code for both turns; every match in an event has a distinct code. Quarterfinals use 4x4, semifinals 6x6 and the final 8x8. Moves decide a match, followed by active milliseconds and then the higher seed. Tournament attempts do not change solo size or best scores.

Start turn creates a fresh board. Next turn and Next match provide handoffs, and the bracket shows the results as they arrive. Leave tournament asks before discarding an unfinished event. An imported unfinished turn is paused until Resume.

## Storage and exchange

Completed tournaments are kept newest first, up to ten, under `np3:tournaments`. The value has exactly `v: 3` and `items`; invalid stored values are treated as empty until a later save. If storage is unavailable, the event continues in memory and the history area explains that it cannot be saved.

Tournament JSON is an object with alphabetically ordered keys, `format: "neon-pairs/tournament"` and `version: 1`. Its `tournament` contains the accepted names, matches, current match index and phase. A match contains its board code, the two zero-based player seeds, results and winner. Each result contains moves and active elapsed milliseconds. Future slots and results are null. `snapshot` is null outside a turn; during a turn it is a version 1 snapshot JSON string. An empty setup exports a null tournament and snapshot.

The loader validates the complete document before replacement. It reconstructs bracket progression and winners from the results, checks names, board sizes and distinct codes, and validates an active snapshot against the current match. Unknown fields are rejected. A failed load keeps both the draft and the current event.
