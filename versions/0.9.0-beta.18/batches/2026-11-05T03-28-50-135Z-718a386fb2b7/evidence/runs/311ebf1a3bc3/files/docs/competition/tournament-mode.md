# Tournament mode

Tournament mode is a local knockout for four or eight people sharing a device. Open it with Tournament next to New Game, choose the number of players, enter their names and select Start tournament. Names are trimmed, whitespace is collapsed and text is normalized to NFC. Each name must contain 2 to 20 Unicode code points and be distinct without regard to case.

Players are seeded in entry order. Opening matches are 1–4 and 2–3 for four players, or 1–8, 4–5, 3–6 and 2–7 for eight. Quarterfinals use 4x4 boards, semifinals use 6x6 and the final uses 8x8. Both players in a match start the same deal; each match has a distinct board code. Fewer moves wins; equal moves are decided by lower active time, then the higher seed.

Start turn begins each attempt. After a completed attempt, Next turn passes the device to the other player. Next match advances after both attempts. The bracket lists results and winners, and the final winner is the champion. Leave tournament asks before abandoning an unfinished event. Tournament games do not change the ordinary saved size or best scores.

The tournament screen lists the most recent ten completed events on this device. Storage failures leave the event playable in memory and show a notice alongside the history. Select a past champion to view its bracket. The game does not automatically save an unfinished tournament.

## Exchange

Export tournament writes JSON into Tournament JSON; Load tournament validates the text before replacing the current event. An in-progress turn is restored paused and can be continued with Resume. Loading over an unfinished event asks for confirmation. Invalid text leaves the current event and draft intact.

A tournament export is a JSON object with `format` set to `neon-pairs/tournament` and `version` set to `1`. Keys are alphabetized in exported objects. It includes the normalized `players`, ordered `matches`, current match `index`, `phase`, and a snapshot string or null. Each match records its `boardCode`, player seed indices, scores and winner. Scores contain `moves` and `elapsedMs`. The loader validates names, codes, scores, pairings, progression, winners and any snapshot before accepting an event. An empty setup exports an object with the same format and version and `tournament: null`.

Completed history uses the `np3:tournaments` browser storage key, with a `{ "v": 3, "items": [...] }` envelope. Browser storage is local to the current origin and device; export provides a separate way to transfer an event.
