# Dialog policy

This page records the confirmation policy for leaving unfinished work and its relationship to the game's existing actions.

New Game, Restart and ordinary board or snapshot loading remain direct solo actions. Tournament mode uses a native `dialog` when Leave tournament would discard an unfinished event or when a valid load would replace it.

## The confirmation boundary

A confirmation is useful only when it corresponds to a real decision about abandoning work. Its content and focus need to make the conservative path understandable before the player commits to leaving. Leaving unfinished work asks first in a native dialog element with two buttons, Keep playing and Leave. Keep playing takes focus when it opens, and Escape keeps playing. The decision is about the unfinished work being left; opening a disclosure to inspect a code is not itself that decision.

The tournament dialog offers Keep playing or Leave/Load tournament. Escape keeps the current event. Tournament JSON export remains a separate user action with a text result; the dialog does not imply that an event has been saved automatically.

Tournament owns the leave route and the main-area replacement without adding a router. Focus policy covers orientation between the solo and tournament screens.

## What the present controls actually do

`Controls.tsx` renders New Game and Restart as native buttons. Their callbacks in `use-game.ts` reset the clock adapter and commit a replacement game. They do not consult `started`, Moves, Pairs or a dialog result before doing so. The existing game replaces immediately when those buttons are used.

BoardCodeForm validates before replacing. Its `loadBoard` callback returns false for invalid input and true after successful replacement. Snapshot loading decodes the whole draft before replacing as well. These paths protect against invalid external data; they are not implementations of a leave confirmation.

The native `details` panel is also not a modal. It expands in document flow and leaves the rest of the page operable. Calling its summary a dialog trigger would misdescribe both the DOM and its focus behavior. Reproduction panel documents the actual disclosure.

This distinction matters during incremental work. A new dialog in one feature does not silently change the semantics of every old control. When reading a change, follow the event handler to see whether it reaches a confirmation boundary, a parser, or the replacement directly. Similar visual labels do not establish the same lifecycle.

## Native behavior and application decisions

The policy names a native element because the interface already relies on browser semantics for buttons, forms, selects and details. A dialog has a different interaction boundary from an ordinary panel. Its opening, cancellation and closing need to be considered as a coherent interaction rather than a div painted over the board.

Using the element alone does not decide what leaving means for a game. The application still owns the transition that discards or replaces state. Tournament uses its controller to leave an event or install a validated import; solo replacements continue through `replaceGame`. Visual disappearance of an overlay is not evidence that a session was replaced, just as visual appearance is not evidence that play was paused.

The distinction between cancellation and commitment is observable in tournament state. Continuing leaves the same match, game and counters available. Leaving discards the in-memory event and returns to solo play; loading replaces it with a validated event. The dialog has no storage write or serialized marker.

No dialog state exists in `Session`. Its fields are `game`, `paused`, `generation`, `feedback`, `loadNotice`, `announcement`, `celebration` and `preferences`. The existing `paused` flag specifically represents unfinished snapshot import. Reusing that flag for a new overlay without considering its other consumers would also affect Resume and load notices.

## Timing questions exposed by an overlay

A mismatch stores its remaining active milliseconds in game selection. The session clock advances it when the page is visible and the imported-pause flag is clear. Merely placing a dialog above the board is not one of those conditions in the current source.

The tournament confirmation does not pause an active turn's elapsed clock or pending mismatch. Its clock continues to use visible-page active time until the event is left or replaced. The modal surface alone does not freeze game state. Clock design and Mismatch interval explain the underlying clock model.

Solo replacement has a well-defined lifecycle today. `clock.reset()` and the session generation prevent old pending updates from affecting a replacement game. Tournament load and leave reset the feature clock and its generation before replacing event state. The dialog does not need to know the two selected card indices to implement that protection.

The period between opening and making a decision is therefore worth observing in review. It can expose accidental differences between the visual state, current game state and timers. The observation is useful even when the feature's intended behavior is simply to preserve the current clock semantics.

## Focus ownership

Opening the confirmation establishes a temporary interaction context. The policy above states its initial focus and cancellation result. That avoids relying on DOM order alone to make the safe continuation choice the first keyboard target.

After a decision, the durability of the source control matters. Existing action buttons generally remain mounted after a deal replacement, while Resume removes itself. Game handles Resume by moving focus before the button is removed. That is a concrete example of a disappearing source, though it is not a dialog implementation.

A leave feature may keep or remove its trigger as part of its surrounding screen. Its focus return depends on which controls remain mounted. A review can inspect the final active element and its visibility.

The board also remembers focus independently of actual focus. Opening another surface would not, by itself, mean its last card index should become a selected turn. A player returning to the board still needs the distinction between orientation and activation described in Board keyboard navigation.

## Review notes for a proposed implementation

The most useful review evidence separates opening, continuing and leaving. A single screenshot of the open surface cannot establish which element is focused, whether Escape follows the continuation path, or whether the underlying controller already replaced the event before a decision.

A source trace can identify the first state-changing call relative to the decision. A keyboard trace can identify the active element at opening and after cancellation. A populated game, especially one with a pending mismatch, makes unintended early replacement visible. These are ways of observing the stated policy and existing game lifecycle, rather than additional product requirements.

Current browser tests establish focus retention on ordinary buttons, invalid draft preservation, Resume's transfer order and stale-timer protection. They do not establish a dialog journey. Any future report of dialog coverage has to point at the corresponding implementation and evidence, rather than citing those tests because they also involve focus.

The relevant background is Native controls guide for element choice, Focus policy for page orientation and New game and restart for the existing replacement boundary. Together they make it possible to review a concrete leave interaction alongside the existing game lifecycle.
