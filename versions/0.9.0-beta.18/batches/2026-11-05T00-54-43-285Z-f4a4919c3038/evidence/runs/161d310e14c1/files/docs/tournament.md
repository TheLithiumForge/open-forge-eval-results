# Tournament mode

Tournament extends solo spec 2.2 with a local knockout for four or eight people sharing one device. Open Tournament beside New Game. Choose Players, enter the labelled Player names, then select Start tournament. Accepted names follow Text entry, Name length and Duplicate names policies.

## Matches and handoffs

Entry order assigns seeds. Four players open as 1–4 and 2–3. Eight open as 1–8, 4–5, 3–6 and 2–7. Adjacent match winners advance. Quarterfinals use 4x4 boards, semifinals 6x6 and the final 8x8; four players begin at Semifinal. Show `Round: NAME` and `Now playing: NAME` during the event.

Each match has one board code shared by both players. All match codes in an event differ. Start turn opens the player's board; the active clock starts on the first reveal, using the existing visibility and mismatch rules. After the first finish, Next turn prepares a fresh hidden copy of that deal for the opponent. After the second finish, Next match prepares the next match. Each prepared turn waits for Start turn.

Fewer moves wins. Equal moves compare exact active elapsed milliseconds, including fractions. Equal time favors the higher entry seed, with seed 1 highest. The bracket table shows each match's players, moves, displayed time and winner; `(winner)` also marks the winning name. Displayed time uses the ordinary minutes and seconds format, independently of comparison precision.

The final finish shows `Champion: NAME` and Back to game. Leave tournament ends an unfinished event after the native confirmation described in Dialog policy. Opening Tournament from unfinished solo play also asks first. Keep playing and Escape preserve the current work. Confirming departure discards it and invalidates its timers. Returning to solo play shows the original solo deal reset. Tournament attempts change neither ordinary best scores nor the saved grid size.

## History

Past tournaments appears on the Tournament setup screen, newest first. Viewing a record opens its completed bracket. Only completed events are saved. History uses `np3:tournaments`, with the exact envelope `{ "v": 3, "items": [...] }`. Each item is a tournament export object described below. Saving retains the newest ten distinct records; loading an identical completed export replaces that record rather than adding a copy. Viewing a past record does not change its recency.

Invalid stored history is silently treated as empty and left untouched until the next save. Denied reads or writes keep history in memory and show `Progress won't be saved on this device.` beside Past tournaments. Existing preferences and unrelated keys retain their formats and values.

## Tournament JSON

Every tournament screen provides Tournament JSON, Export tournament and Load tournament. Export fills the editable box without stopping the clock. It synchronizes active time before capturing progress. Text is readable JSON with alphabetically ordered object keys throughout. The root has exactly `format`, `state` and `version`, with format `neon-pairs/tournament` and integer version `1`.

State has exactly `game`, `matches`, `names` and `phase`. Names is the ordered list of four or eight names. Matches is empty during setup, otherwise it has one record per match in round order. Each record has `boardCode` and `results`; each result has `elapsedMs` and `moves`. Opponents and winners are derived from the entry order and results. Phases are `setup`, `ready`, `playing`, `turnEnd`, `matchEnd` and `complete`.

Game is null in setup. Otherwise it has the version 1 snapshot fields for the current or just-finished turn, with fractional elapsed and mismatch milliseconds retained for tournament comparison. This tournament representation does not change the existing snapshot format. Completed-turn values must agree with the corresponding match result. Completed results form a contiguous prefix, with at most one partially finished match. Codes must have the round's size and be distinct; names and counters must satisfy their normal rules.

Loads validate the entire document before replacing anything. The input limit is 65536 UTF-8 bytes; the native box also limits its character count. Unsupported versions, malformed data and inconsistent progress show `Invalid tournament.`. Unknown properties show `Unknown field: NAME.` for the first field in root, state, matches/results, game and selection traversal order. Rejection preserves the draft and active event. A valid replacement of unfinished work requires the leave confirmation. Loaded active play waits at Start turn with its progress intact, excluding time spent waiting. Loading a completed event also saves it in history.

## Implementation and evidence

`src/game/tournament/rules.ts` owns pure progression. Pairing, accepted names and format validation have neighboring modules. `use-tournament.ts` adapts those rules to the existing session clock and card transitions, with ordinary score recording disabled and no preference-save effect. `Game.tsx` owns the single polite atomic live region and screen-heading focus. The bracket uses a captioned native table, and departure uses a native dialog.

Adjacent unit tests cover both bracket shapes, comparisons, names, format validation, isolation and history retention. Browser journeys in `tests/tournament*.e2e.test.ts` cover complete four- and eight-player events, JSON replacement, reloads, confirmations, blocked/corrupt storage, reduced motion and phone/zoom geometry. These are automated browser checks; spoken output remains user acceptance.
