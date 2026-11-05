---
open-forge:
  description: The leave-work confirmation policy and its boundary with current
    direct deal actions.
  tags:
    - Controls
    - Dialogs
    - Policy
---
# Dialog policy

This page records the confirmation policy for leaving unfinished work and its relationship to the game's existing actions.

`src/game/tournament/LeaveTournamentDialog.tsx` implements the native confirmation for leaving unfinished tournament work. New Game, Restart, board-code loading and snapshot loading still call their solo controller directly.

## The confirmation boundary

A confirmation is useful only when it corresponds to a real decision about abandoning work. Its content and focus need to make the conservative path understandable before the player commits to leaving. Leaving unfinished work asks first in a native dialog element with two buttons, Keep playing and Leave. Keep playing takes focus when it opens, and Escape keeps playing. The decision is about the unfinished work being left; opening a disclosure to inspect a code is not itself that decision.

The dialog has no third action. In particular, the snapshot exporter does not turn this confirmation into an automatic save workflow. Export is a separate user action with a text result. Leaving the tournament discards only the unfinished event; completed tournaments already in Past tournaments remain saved.

The tournament feature owns the leave route and returns to the solo game after confirmation. The application still has no router; `Game.tsx` switches between the solo and tournament screens. [Focus policy](focus-policy.md) covers orientation at that main-area replacement.

## What the present controls actually do

`Controls.tsx` renders New Game and Restart as native buttons. Their callbacks in `use-game.ts` reset the clock adapter and commit a replacement game. They do not consult `started`, Moves, Pairs or a dialog result before doing so. The existing game replaces immediately when those buttons are used.

BoardCodeForm validates before replacing. Its `loadBoard` callback returns false for invalid input and true after successful replacement. Snapshot loading decodes the whole draft before replacing as well. These paths protect against invalid external data; they are not implementations of a leave confirmation.

The native `details` panel is also not a modal. It expands in document flow and leaves the rest of the page operable. Calling its summary a dialog trigger would misdescribe both the DOM and its focus behavior. [Reproduction panel](reproduction-panel.md) documents the actual disclosure.

This distinction matters during incremental work. A new dialog in one feature does not silently change the semantics of every old control. When reading a change, follow the event handler to see whether it reaches a confirmation boundary, a parser, or the replacement directly. Similar visual labels do not establish the same lifecycle.

## Native behavior and application decisions

The policy names a native element because the interface already relies on browser semantics for buttons, forms, selects and details. A dialog has a different interaction boundary from an ordinary panel. Its opening, cancellation and closing need to be considered as a coherent interaction rather than a div painted over the board.

Using the element alone does not decide what leaving means for a game. The application still owns the transition that discards state. The tournament leave callback returns to the solo screen, unmounting the unfinished event while preserving completed history. Visual disappearance of an overlay is not evidence that a session was replaced, just as visual appearance is not evidence that play was paused.

The distinction between cancellation and commitment is observable in tournament state. Continuing leaves the same deal, revealed selection and counters available. A committed departure unmounts the event. The dialog has no separate storage write or serialized marker.

No dialog state exists in `Session`. Its fields are `game`, `paused`, `generation`, `feedback`, `loadNotice`, `announcement`, `celebration` and `preferences`. The existing `paused` flag specifically represents unfinished snapshot import. Reusing that flag for a new overlay without considering its other consumers would also affect Resume and load notices.

## Timing questions exposed by an overlay

A mismatch stores its remaining active milliseconds in game selection. The session clock advances it when the page is visible and the imported-pause flag is clear. Merely placing a dialog above the board is not one of those conditions in the current source.

Opening the tournament confirmation does not pause its elapsed clock or mismatch. A modal surface does not itself freeze play. [Clock design](../architecture/clock-design.md) and [Mismatch interval](../gameplay/mismatch-interval.md) explain the shared clock model.

The tournament clock remains owned by its mounted session. Leaving unmounts that session and its scheduled work is cleaned up by the clock effect. The dialog does not need to know the two selected card indices to implement that lifecycle.

The period between opening and making a decision is therefore worth observing in review. It can expose accidental differences between the visual state, current game state and timers. The observation is useful even when the feature's intended behavior is simply to preserve the current clock semantics.

## Focus ownership

Opening the confirmation establishes a temporary interaction context. The policy above states its initial focus and cancellation result. That avoids relying on DOM order alone to make the safe continuation choice the first keyboard target.

After a decision, the durability of the source control matters. Existing action buttons generally remain mounted after a deal replacement, while Resume removes itself. Game handles Resume by moving focus before the button is removed. That is a concrete example of a disappearing source, though it is not a dialog implementation.

The tournament leave trigger is removed when the application returns to solo play. `Game.tsx` focuses the solo heading after that screen replacement. A review can inspect the final active element and its visibility.

The board also remembers focus independently of actual focus. Opening another surface would not, by itself, mean its last card index should become a selected turn. A player returning to the board still needs the distinction between orientation and activation described in [Board keyboard navigation](board-keyboard-navigation.md).

## Review notes for the tournament leave flow

The tournament leave dialog's review evidence separates opening, continuing and leaving. A single screenshot of the open surface cannot establish which element is focused, whether Escape follows the continuation path, or whether the active tournament was discarded before a decision.

A source trace can identify the first state-changing call relative to the decision. A keyboard trace can identify the active element at opening and after cancellation. A populated match makes unintended early departure visible. These observations apply to the implemented tournament leave flow.

Current browser tests establish focus retention on ordinary buttons, invalid draft preservation, Resume's transfer order and stale-timer protection. They do not establish a dialog journey. Any future report of dialog coverage has to point at the corresponding implementation and evidence, rather than citing those tests because they also involve focus.

The relevant background is [Native controls guide](native-controls-guide.md) for element choice, [Focus policy](focus-policy.md) for page orientation and [New game and restart](../gameplay/new-game-and-restart.md) for the existing replacement boundary. Together they make it possible to review a concrete leave interaction alongside the existing game lifecycle.
