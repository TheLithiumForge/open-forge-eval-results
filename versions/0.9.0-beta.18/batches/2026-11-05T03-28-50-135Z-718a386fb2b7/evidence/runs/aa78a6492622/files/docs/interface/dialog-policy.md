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

Tournament mode uses a native dialog before an unfinished event is discarded. New Game, Restart, board-code loading and snapshot loading in solo play still call the controller directly.

## The confirmation boundary

A confirmation is useful only when it corresponds to a real decision about abandoning work. Its content and focus need to make the conservative path understandable before the player commits to leaving. Leaving unfinished work asks first in a native dialog element with two buttons, Keep playing and Leave. Keep playing takes focus when it opens, and Escape keeps playing. The decision is about the unfinished work being left; opening a disclosure to inspect a code is not itself that decision.

There is no third action specified by this policy. In particular, the existing snapshot exporter does not turn this confirmation into an automatic save workflow. Export is a separate user action with a text result. A feature that uses the confirmation can draw on that distinction without presenting an unsaved draft as if it had already been preserved.

The Tournament screen owns its Leave tournament route without adding a router. Leaving setup before an event starts exits directly; leaving an unfinished event asks for confirmation. Loading a different valid tournament also confirms before replacing unfinished work. Opening the dialog pauses its tournament clock, Keep playing resumes from a fresh clock baseline, and Leave either exits or applies the pending load. [Focus policy](focus-policy.md) covers the main-area screen transition.

## What the present controls actually do

`Controls.tsx` renders New Game, Tournament and Restart as native buttons. New Game and Restart still commit a replacement immediately. The Tournament screen's Leave tournament button opens the confirmation only when an unfinished event exists. Its dialog uses native `<dialog>`, initially focuses Keep playing and treats Escape as Keep playing.

BoardCodeForm validates before replacing. Its `loadBoard` callback returns false for invalid input and true after successful replacement. Snapshot loading decodes the whole draft before replacing as well. These paths protect against invalid external data; they are not implementations of a leave confirmation.

The native `details` panel is also not a modal. It expands in document flow and leaves the rest of the page operable. Calling its summary a dialog trigger would misdescribe both the DOM and its focus behavior. [Reproduction panel](reproduction-panel.md) documents the actual disclosure.

This distinction matters during incremental work. A new dialog in one feature does not silently change the semantics of every old control. When reading a change, follow the event handler to see whether it reaches a confirmation boundary, a parser, or the replacement directly. Similar visual labels do not establish the same lifecycle.

## Native behavior and application decisions

The policy names a native element because the interface already relies on browser semantics for buttons, forms, selects and details. A dialog has a different interaction boundary from an ordinary panel. Its opening, cancellation and closing need to be considered as a coherent interaction rather than a div painted over the board.

Using the element alone does not decide what leaving means for a game. The application still owns the transition that discards or replaces state. In the current implementation, that transition is represented by controller operations and `replaceGame`. Visual disappearance of an overlay is not evidence that a session was replaced, just as visual appearance is not evidence that play was paused.

The distinction between cancellation and commitment is observable in game state. Continuing leaves the same deal, revealed selection and counters available. A committed departure may dispose of or replace the session, depending on the feature. The current game has no dialog-specific storage write or serialized marker.

No dialog state exists in the solo `Session`. Its `paused` flag specifically represents unfinished snapshot import. Tournament confirmation state stays in the Tournament screen and does not reuse that flag or enter exported event data.

## Timing questions exposed by an overlay

A mismatch stores its remaining active milliseconds in game selection. The session clock advances it when the page is visible and the imported-pause flag is clear. Merely placing a dialog above the board is not one of those conditions in the current source.

The solo session has no confirmation dialog and its clock does not know about modal state. Tournament mode synchronizes elapsed time when the confirmation opens and pauses its independent clock until the player keeps playing or leaves. Its timing boundary is visible in `Tournament.tsx` and `use-tournament-clock.ts`. [Clock design](../architecture/clock-design.md) and [Mismatch interval](../gameplay/mismatch-interval.md) explain the solo clock model.

Solo replacement has a well-defined lifecycle: `clock.reset()` and the session generation prevent old pending updates from affecting a replacement game. Tournament Leave discards the event held by its hook and returns to solo play; the tournament clock is cleaned up with that screen.

The period between opening and making a decision is therefore worth observing in review. It can expose accidental differences between the visual state, current game state and timers. The observation is useful even when the feature's intended behavior is simply to preserve the current clock semantics.

## Focus ownership

Opening the confirmation establishes a temporary interaction context. The policy above states its initial focus and cancellation result. That avoids relying on DOM order alone to make the safe continuation choice the first keyboard target.

After a decision, the durability of the source control matters. Existing action buttons generally remain mounted after a deal replacement, while Resume removes itself. Game handles Resume by moving focus before the button is removed. That is a concrete example of a disappearing source, though it is not a dialog implementation.

Keep playing closes the native dialog and returns focus to Leave tournament. Choosing Leave removes the Tournament screen and focuses “Play” according to [Focus policy](focus-policy.md).

The board also remembers focus independently of actual focus. Opening another surface would not, by itself, mean its last card index should become a selected turn. A player returning to the board still needs the distinction between orientation and activation described in [Board keyboard navigation](board-keyboard-navigation.md).

## Review notes for a proposed implementation

The most useful review evidence separates opening, continuing and leaving. A single screenshot of the open surface cannot establish which element is focused, whether Escape follows the continuation path, or whether the underlying controller already replaced the game before a decision.

A source trace can identify the first state-changing call relative to the decision. A keyboard trace can identify the active element at opening and after cancellation. A populated game, especially one with a pending mismatch, makes unintended early replacement visible. These are ways of observing the stated policy and existing game lifecycle, rather than additional product requirements.

`tests/tournament.e2e.test.ts` opens the native dialog, checks that Keep playing has focus, confirms Escape keeps the event active, then leaves. These checks establish the dialog journey in Chromium; they do not establish spoken behavior in a screen reader.

The relevant background is [Native controls guide](native-controls-guide.md) for element choice, [Focus policy](focus-policy.md) for page orientation and [New game and restart](../gameplay/new-game-and-restart.md) for the existing replacement boundary. Together they make it possible to review a concrete leave interaction alongside the existing game lifecycle.
