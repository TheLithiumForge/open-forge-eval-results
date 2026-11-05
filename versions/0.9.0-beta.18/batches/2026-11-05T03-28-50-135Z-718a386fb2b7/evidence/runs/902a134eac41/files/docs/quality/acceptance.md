# Acceptance

Acceptance is a set of journeys that checks whether Neon Pairs meets its product requirements.

Status: spec version 2.2.

Finish a game, then start another one during a mismatch. The first journey checks play and completion. The second checks that an earlier timer can't change a new game.

## Play

Use these journeys with the requirements in [Rules](../gameplay/rules.md):

- Finish every supported size with complete pairs.
- Reveal one card twice, then reveal a different card. Check the exact move count.
- Match a pair, then miss a pair. Check the immediate match and the 800ms active mismatch interval.
- Hide the page during a mismatch, then return and finish its remaining interval.
- Start and restart during a mismatch. Check the cleared state and later timer updates.
- Finish games with better, equal and worse move counts. Reload and check the current size's best.

## Controls

Use pointer, touch and keyboard to follow [Input](../interface/input.md) and [Controls](../interface/controls.md). Check control labels, row movement, edge stops, native Tab exit and focus after each action. Check that hidden cards reveal no identity in the DOM.

Follow the keyboard journey in I17 and check its accessibility tree. During user acceptance, confirm spoken results with a screen reader, including consecutive identical results and the final match with its win.

## Appearance

Measure the layout and review all 128 faces against [Visuals](../visuals/visuals.md). Use a 44px grayscale face sheet to distinguish shape, marker and fill. Check 16x16 boards at both stated viewport sizes, full focus outlines and the equivalent zoom layout. Check reduced motion and the static completion banner after its single pulse.

Play through completion and reset while checking [Sound](../sound/sound.md). Every action stays silent.

## Reproduction

Check [Reproducibility](../sharing/reproducibility.md) with its example deck and replay. Check snapshot round trips and malformed input. Check the exact mismatch timeout before an equal-time replay action.

Load an unfinished snapshot, attempt input while paused, then Resume. Check its remaining active time and focus. Load a completed snapshot and check its static banner and unchanged best score.

## Tournament

Use four entrants and confirm the opening matches are seeds 1–4 and 2–3, then use eight and confirm 1–8, 4–5, 3–6 and 2–7. Check that each stage uses its specified board size and every match has a distinct board code. In a match, play both turns and confirm the second game resets progress but uses the same code. Check the visible `Round: NAME`, `Now playing: NAME`, Start turn, Next turn and Next match states.

Compare a lower move count against a faster but higher move count, then exercise equal moves with lower time and exact equality with the higher seed. Confirm both scores and the winner appear in the bracket. Finish the Final, check `Champion: NAME`, then reload and find the event under Past tournaments. Export and load setup, active and finished Tournament JSON; submit malformed JSON and confirm the current event remains available. Open Leave tournament, check that Keep playing receives focus, and use Escape to confirm the event continues. Confirm Leave returns to the solo game. Compare solo preferences before and after tournament completion to confirm the event changes neither selected size nor best moves.

## Delivery

Use a locked install, type check, unit tests and a fresh browser build as defined in [Technology](../architecture/technology.md). Open the resulting HTML directly from disk with network access blocked. Use a local HTTP origin for saved preferences.

Review the pure game functions, browser effects, file sizes and behavior placement against [Architecture](../architecture/architecture.md).

Back to [Neon Pairs](../README.md).
