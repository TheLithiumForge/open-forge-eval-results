# Tournament mode

This document defines the shared-device Tournament extension to Neon Pairs.

## Setup and play

The Tournament button beside New Game replaces the main game view. The Players select offers 4 or 8; the form shows inputs labelled Player 1 through the selected count. Start tournament accepts names using the [representation](../interface/text-entry-policy.md), [length](../interface/name-length-policy.md) and [duplicate](../interface/duplicate-names-policy.md) policies. Invalid names leave the form editable.

Entry order establishes seeds and the [opening pairings](competition-pairing.md). Play follows the displayed match order, then adjacent winners meet in the next round. [Round names](competition-rounds.md) appear as `Round: NAME`; [board dimensions](competition-boards.md) are 4x4 for Quarterfinal, 6x6 for Semifinal and 8x8 for Final.

Each match has a distinct board code. Both players start fresh games on that same code. `Now playing: NAME` identifies the current player; Start turn enables their board. The first player's finish exposes Next turn, which prepares the second player's fresh board and another Start turn. The second finish exposes Next match, except that the final finish shows `Champion: NAME` and Back to game.

Fewer moves wins. Equal moves compare exact active milliseconds, then seed order, with seed 1 highest. Waiting before the first reveal, handoff screens and hidden-page time do not contribute to active time. The [ordinary game clock](../gameplay/elapsed-time-rules.md) and mismatch rules still apply during play.

The bracket is a table with a caption and column headers. Each match shows its round, board code, players, completed move counts, formatted times and winner. Future players remain undecided until their preceding matches finish.

Leave tournament returns to solo play without saving an unfinished event. Leaving unfinished play, or loading valid replacement data over an unfinished tournament, first opens a native dialog with Keep playing and Leave. Keep playing receives focus; Escape cancels. Invalid imports never open the dialog. Screen changes focus the screen's h2 with `tabindex="-1"`. Turn feedback, ownership and load outcomes use the one polite atomic status region in Game.tsx.

Solo progress is held in memory while Tournament is open. Returning restores it, including an unfinished snapshot's existing pause. Tournament games never alter ordinary saved size or best scores.

## Finished history

Completed tournaments appear in Past tournaments on the setup screen. Selecting an entry opens its completed bracket and JSON controls. The list is newest first, keeps ten entries and suppresses identical copies of the same exported event.

The storage key is `np3:tournaments`. Its value has exactly `v: 3` and `items`, an array of complete tournament exchange objects in newest-first order. Invalid stored data produces an empty list and is untouched until an actual completion or completed import saves a replacement. Only completed events are saved automatically; ongoing tournaments use explicit export.

Storage failures keep results usable in memory and show `Progress won't be saved on this device.` beside saved records. Existing preferences and unrelated storage keys remain untouched.

## Tournament JSON

Every Tournament view contains Export tournament, Load tournament and a textarea labelled Tournament JSON. Export fills the textarea with readable JSON. It synchronizes the active clock without pausing or resetting play. Load validates the entire draft before replacement and preserves the draft on failure. A loaded active game waits for Start turn; its saved cards, counters and mismatch remainder are preserved.

The root has exactly these fields, written in alphabetical key order at every object level:

| Field        | Value                                                |
| ------------ | ---------------------------------------------------- |
| `format`     | `"neon-pairs/tournament"`                            |
| `setup`      | Four or eight name drafts, or `null` during an event |
| `tournament` | Event object, or `null` for setup                    |
| `version`    | Integer `1`                                          |

Exactly one of `setup` and `tournament` is non-null. Setup drafts are normalized when exported or loaded; their length and uniqueness are checked on Start tournament.

An event has exactly `game`, `matchIndex`, `matches`, `phase`, `players` and `turn`. `players` holds four or eight accepted names in seed order. `matches` contains three or seven entries in round order, each with exactly `boardCode` and `results`. Every code has the required round size and is unique within that event. `results` has two entries in player order, each either `null` or an object with exactly `elapsedMs` and `moves`.

Completed results require finite nonnegative elapsed milliseconds up to the ordinary elapsed cap, and integer moves between that board's pair count and the move cap. Fractional result milliseconds are preserved for comparisons. Winners and future opponents are derived from results rather than accepted as editable claims.

`matchIndex` is the zero-based current match; `turn` is 0 or 1. `phase` is `ready`, `playing`, `turn-finished`, `match-finished` or `complete`. Earlier matches must have both results, future matches neither, and current results must agree with turn and phase. `game` is a complete valid version 1 snapshot for the current code. Ready games are unstarted; finished phases require won snapshots with counters agreeing with the recorded result. Snapshot precision follows [the existing snapshot format](../sharing/snapshot-format.md); exact completed-result time is retained separately.

Input is limited to 262144 UTF-8 bytes. Malformed, unsupported or inconsistent data shows `Invalid tournament.`. An extra field at any defined object boundary shows `Unknown field: NAME.` for the first extra field encountered. Both failures preserve the current tournament and text.

## Implementation and verification

Pure tournament decisions live in `src/game/tournament/rules.ts`, name processing in `names.ts`, and decoding in `format.ts` and `validation.ts`. `src/game/session/use-tournament.ts` reuses the session clock and shared card transitions with best-score recording disabled. Components and history storage live beside the tournament rules.

Colocated tests cover pairing, round sizes, exact ties, handoffs, names, consistency checks, unknown fields, corrupt storage and retention. Browser journeys in `tests/tournament*.e2e.test.ts` exercise complete four- and eight-player events, reloads, paused import, leave confirmation, storage denial and phone controls. These provide automated browser evidence; spoken screen-reader output remains user acceptance.
