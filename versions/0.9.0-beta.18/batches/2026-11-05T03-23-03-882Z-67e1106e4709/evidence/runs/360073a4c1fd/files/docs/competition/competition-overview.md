---
open-forge:
  description: Shared-device tournament flow, JSON exchange, saved history and
    implementation boundaries.
  tags:
    - Competition
    - Product
    - Architecture
---

# Shared-device competition

This page explains the purpose, scope and implementation context of shared-device competition in Neon Pairs.

Competition gives a group gathered around one device a reason to return to the board together. It is intended for the small social setting: a family laptop, a tablet passed around a table, or a few people taking a break at the same desk. The interesting product question is how individual memory play becomes a shared occasion without losing the clarity of the existing game.

## Where the product stands

The game implements solo play and a Tournament screen for 4 or 8 people sharing one device. Tournament sits beside New Game. Players selects the entrant count; Player 1 through Player 8 label the corresponding name inputs. Start tournament accepts names using the [text entry](../interface/text-entry-policy.md), [length](../interface/name-length-policy.md) and [duplicate-name](../interface/duplicate-names-policy.md) policies.

The competition pages define [entry-order pairing](competition-pairing.md), [round names](competition-rounds.md), [board sizes](competition-boards.md), [deal identity](competition-deals.md), [tie-breaks](competition-ties.md) and [solo-score isolation](competition-scores.md). Their descriptions of the original solo-only code explain the integration problems that preceded this feature. The implementation below resolves those gaps without changing the version 1 board, snapshot or replay formats.

## Turn handoffs and completion

Each match starts with Now playing: NAME and Round: NAME. Start turn opens that person's fresh hidden game. Active time follows the ordinary first-reveal and page-visibility rules. The first finish records moves and time and offers Next turn, followed by the second player's Start turn. Both attempts begin with the same board code. The second finish determines a winner and offers Next match. The final finish shows Champion: NAME and Back to game.

The bracket is a captioned table with each match's round, players, moves, time and winner. Future players remain To be decided until their preceding matches finish. Displayed time uses the ordinary minutes-and-seconds format; comparison retains the full active milliseconds.

Leave tournament stops an event early. Leaving an unfinished event, replacing one with a valid import, or opening Tournament from unfinished solo play uses the native confirmation required by [Dialog policy](../interface/dialog-policy.md). Keep playing receives focus, and Escape continues. Replacing the main screen focuses its h2. Results and turn-owner announcements use the single status region defined in `Game.tsx`.

## Saved history and exchange

Past tournaments lists the newest ten completed events, including completed imports. Selecting a record opens its finished bracket. Exact duplicate records are kept once. Unfinished events remain in memory until explicitly exported. Finished records use `np3:tournaments` with the exact storage envelope `{ "items": [...], "v": 3 }`. Invalid saved data reads as empty without changing its string. Storage failure preserves in-memory play and shows Progress won't be saved on this device. beside the saved list.

Every tournament screen offers Export tournament, Load tournament and the editable Tournament JSON box. Export fills the box without pausing play. Import validates the whole draft before replacement; failure preserves the event and draft and publishes Invalid tournament. An unknown property instead reports Unknown field: NAME. A restored unfinished turn remains paused until Start turn.

Tournament exchange version 1 has these exact root fields, serialized alphabetically:

| Field        | Value                                                                    |
| ------------ | ------------------------------------------------------------------------ |
| `format`     | `neon-pairs/tournament`                                                  |
| `matchIndex` | Zero-based current match, or 0 during setup                              |
| `matches`    | Ordered `{boardCode, results}` records for the whole bracket             |
| `phase`      | `setup`, `ready`, `playing`, `turnOver`, `matchOver` or `complete`       |
| `players`    | Four or eight names in entry order; unaccepted drafts during setup       |
| `snapshot`   | An existing version 1 snapshot JSON string during play, otherwise `null` |
| `version`    | 1                                                                        |

Each result contains `elapsedMs` and `moves`; its position identifies the corresponding player. Winners are derived from results and entry seeds. Match codes must be unique, valid and correctly sized for their rounds. Earlier matches must have two results, later matches none, and the current result count must agree with the phase. Results require finite bounded active milliseconds and integer moves between the board's pair count and the ordinary move cap. A playing snapshot must describe unfinished progress on the current deal. Setup has no matches or snapshot. Imports accept at most 262144 UTF-8 bytes. New object keys are alphabetical at every level; the embedded snapshot string retains its existing format.

## Why share a device

A shared screen makes the activity visible. People can talk about the artwork, remember a near miss and recognize the effort behind another person's finish. There is no remote opponent waiting behind a network connection, and no account setup between the group and the game. The game already has a compact delivery model: the built game can be opened from one HTML file.

Sharing hardware also changes what people expect. On a personal device, a result feels like part of that person's practice. On a shared tablet, the person holding it may have changed several times since the page opened. A familiar status area can therefore carry a different social meaning even when its numbers are technically correct. The distinction between a person's current attempt, the group's progress and the device's ordinary records is especially easy to blur.

Competition is useful when it gives those existing actions a context people can follow. It is less useful when the group spends more attention administering the session than remembering cards. This is why the research discussion concentrates on interruptions, orientation and the physical act of passing the device, rather than treating the bracket drawing as the whole feature.

## Three things people are following

An individual concentrating on a board is following card positions and remembered faces. Someone waiting nearby is following the social event: who is occupied, whether a finish is close and when attention will return to the group. The person explaining the game is following the application itself, often watching for a control that might replace the current position.

These perspectives overlap, but they are not interchangeable. A board full of exposed faces is meaningful to the current player. It gives a waiting person relatively little information about where the group is in its event. A compact event view can answer that social question, while the ordinary board remains the place where the player thinks.

The competition documents separate these subjects so that readers can find the relevant decision without extracting it from a long screen-by-screen walkthrough. [Pairing](competition-pairing.md) covers the relationship between entrants and the bracket. [Rounds](competition-rounds.md) covers event stages. [Boards](competition-boards.md) and [deals](competition-deals.md) distinguish the dimensions of a board from its actual arrangement. [Ties](competition-ties.md) and [scores](competition-scores.md) address results from different angles.

## A local social activity, with local evidence

The current project has no backend or account service. Its board codes and exported progress are useful for reproducing a situation, not for establishing the identity of a person who played it. That is a comfortable fit for a group that is physically present and can see what happened. It is a much weaker basis for claims about distant strangers.

The same limitation applies to development evidence. A replay can help an engineer understand a sequence of card actions. A screenshot can help someone understand what the group saw. Neither explains why a participant handed the tablet back early, or whether someone had been watching another person's screen. Those are observations about the setting, and they belong in the research account rather than in an assertion about the game engine.

[Reproducibility](../sharing/reproducibility.md) explains the existing technical tools. [Competition research](competition-research.md) describes local sessions and the limits of drawing conclusions from them. The two accounts answer different questions and are useful together.

## How the current code helps

The core already separates game data from presentation. `src/game/game.ts` contains card transitions and logical elapsed time. `src/game/deck.ts` contains board parsing and deterministic generation. Those files have no participant knowledge. That makes them a useful basis for discussing competition without embedding group administration into card rendering.

The browser session is a separate layer under `src/game/session`. `use-tournament-game.ts` reuses the existing active clock and turn feedback while disabling the best-score update and never loading or writing solo preferences. Disposing of a turn clears its clock work. Random deal selection remains in `session/fresh-board.ts`; the feature rejects codes already allocated to another match.

`src/game/tournament/rules.ts` owns bracket progression and comparisons without React or browser effects. Its adjacent tests cover names, pairing, results and advancement. `format.ts` and `format-validation.ts` validate exchange data; `storage.ts` adapts completed records to browser storage. Browser journeys in `tests/tournament*.e2e.test.ts` exercise complete events, reload, import, confirmation, storage failure and phone controls.

The board itself lives under `src/game/board`. Its card buttons and navigation code operate on positions. The status view receives a game and a best value; it does not discover an event or a participant. [Architecture](../architecture/architecture.md), [session module](../architecture/session-module.md) and [React boundaries](../architecture/react-boundaries.md) give the broader engineering context.
