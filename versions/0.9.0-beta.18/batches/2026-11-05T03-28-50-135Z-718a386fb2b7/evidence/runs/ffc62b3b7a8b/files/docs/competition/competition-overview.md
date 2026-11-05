---
open-forge:
  description: Purpose and social context of shared-device competition, with an
    honest boundary around the solo implementation.
  tags:
    - Competition
    - Product
    - Architecture
---

# Shared-device competition

This page explains the purpose, scope and implementation context of shared-device competition in Neon Pairs.

Competition gives a group gathered around one device a reason to return to the board together. It is intended for the small social setting: a family laptop, a tablet passed around a table, or a few people taking a break at the same desk. The interesting product question is how individual memory play becomes a shared occasion without losing the clarity of the existing game.

## Tournament play

Tournament opens from the game controls. Enter four or eight distinct names and select Start tournament. Names are trimmed, internal whitespace is collapsed, and text is normalized to NFC; each name must have 2–20 Unicode code points and be unique without regard to case. The bracket uses the [pairings](competition-pairing.md), [round names](competition-rounds.md), [board sizes](competition-boards.md), [deals](competition-deals.md), and [tie-breaks](competition-ties.md) in this scope. Tournament play does not change solo preferences or best scores.

Start turn begins each player’s board. Next turn passes to the other player, and Next match advances the bracket or shows the champion. Leave tournament confirms before discarding unfinished play. Completed tournaments appear under Past tournaments on the setup screen; the newest ten are retained on this device. If storage is unavailable, the current session remains usable and the screen reports that progress will not be saved.

Every tournament screen includes Tournament JSON, Export tournament and Load tournament. The version 1 JSON object has `format: "neon-pairs/tournament"`, `version`, `tournament` and `snapshot` fields, with keys in alphabetical order. A tournament contains normalized `names`, a `phase`, and ordered `matches`. Each match contains `boardCode`, zero-based entry indices in `players`, and completed `results` containing `moves` and `elapsedMs`. A playing turn carries its current version 1 snapshot as a JSON string; other phases use `null`. On the empty setup screen both tournament and snapshot are `null`. Import validates names, match order, deal uniqueness, scores, phase and snapshot before replacement, retaining the draft and current tournament on failure. Unknown fields are identified by name. Loading an unfinished tournament asks before replacing it.

The saved history uses `np3:tournaments`, with the feature envelope `{ "v": 3, "items": [...] }`. An invalid stored value is ignored until a later save. Browser storage failures do not stop play.

## Why share a device

A shared screen makes the activity visible. People can talk about the artwork, remember a near miss and recognize the effort behind another person's finish. There is no remote opponent waiting behind a network connection, and no account setup between the group and the game. The game already has a compact delivery model: the built game can be opened from one HTML file.

Sharing hardware also changes what people expect. On a personal device, a result feels like part of that person's practice. On a shared tablet, the person holding it may have changed several times since the page opened. A familiar status area can therefore carry a different social meaning even when its numbers are technically correct. The distinction between a person's current attempt, the group's progress and the device's ordinary records is especially easy to blur.

Competition is useful when it gives those existing actions a context people can follow. It is less useful when the group spends more attention administering the session than remembering cards. This is why the research discussion concentrates on interruptions, orientation and the physical act of passing the device, rather than treating the bracket drawing as the whole feature.

## Three things people are following

An individual concentrating on a board is following card positions and remembered faces. Someone waiting nearby is following the social event: who is occupied, whether a finish is close and when attention will return to the group. The person explaining the game is following the application itself, often watching for a control that might replace the current position.

These perspectives overlap, but they are not interchangeable. A board full of exposed faces is meaningful to the current player. It gives a waiting person relatively little information about where the group is in its event. A compact event view can answer that social question, while the ordinary board remains the place where the player thinks.

The competition documents separate these subjects so that readers can find the relevant decision without extracting it from a long screen-by-screen walkthrough. [Pairing](competition-pairing.md) covers the relationship between entrants and the bracket. [Rounds](competition-rounds.md) covers event stages. [Boards](competition-boards.md) and [deals](competition-deals.md) distinguish the dimensions of a board from its actual arrangement. [Ties](competition-ties.md) and [scores](competition-scores.md) address results from different angles.

## A local social activity, with local evidence

The project has no backend or account service. Its board codes and exported progress are useful for reproducing a situation, not for establishing the identity of a person who played it. That is a comfortable fit for a group that is physically present and can see what happened. It is a much weaker basis for claims about distant strangers.

The same limitation applies to development evidence. A replay can help an engineer understand a sequence of card actions. A screenshot can help someone understand what the group saw. Neither explains why a participant handed the tablet back early, or whether someone had been watching another person's screen. Those are observations about the setting, and they belong in the research account rather than in an assertion about the game engine.

[Reproducibility](../sharing/reproducibility.md) explains the existing technical tools. [Competition research](competition-research.md) describes local sessions and the limits of drawing conclusions from them. The two accounts answer different questions and are useful together.

## How the current code helps

The core already separates game data from presentation. `src/game/game.ts` contains card transitions and logical elapsed time. `src/game/deck.ts` contains board parsing and deterministic generation. Those files have no participant knowledge. That makes them a useful basis for discussing competition without embedding group administration into card rendering.

The browser session is a separate layer under `src/game/session`. It owns the bridge between that core and React, browser visibility, clock observations and preferences. This is the most consequential boundary for an extension: reusing a visual component is easy to notice, while inheriting a session side effect can remain hidden until much later.

The board itself lives under `src/game/board`. Its card buttons and navigation code operate on positions. The status view receives a game and a best value; it does not discover an event or a participant. [Architecture](../architecture/architecture.md), [session module](../architecture/session-module.md) and [React boundaries](../architecture/react-boundaries.md) give the broader engineering context.
