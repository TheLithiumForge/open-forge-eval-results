---
open-forge:
  description: Interface scope for the game's controls, pointer, touch, keyboard,
    focus, names, dialogs, tables and screen reader behavior
  tags:
    - Game
    - Interface
    - Accessibility
---
# Controls and input

Interface scope for the game's controls, pointer, touch, keyboard, focus, names, dialogs, tables and screen reader behavior.

## Axioms

- inherited - No local axioms; loaded ancestor axioms remain active.

## Entries

- [Status publication, repeated event identity, turn results and load feedback.](announcements-policy.md) - #Input #Accessibility #Status
- [Arrow target calculations, remembered board entry, DOM focus and nearest scrolling.](board-keyboard-navigation.md) - #Input #Keyboard #Focus
- [The deal buttons, size selector, responsive arrangement and session callbacks in Controls.tsx.](control-bar.md) - #Controls #Layout #Session
- [Game options and reproduction controls](controls.md) - #Game #Controls
- [The leave-work confirmation policy and its boundary with current direct deal actions.](dialog-policy.md) - #Controls #Dialogs #Policy
- [Matched ARIA state, game eligibility, imported pause and continued focus movement.](disabled-state-guide.md) - #Input #State #Accessibility
- [Group-scoped name comparison, case handling and evidence for repeat detection.](duplicate-names-policy.md) - #Forms #Names #Validation
- [Load validation, visible notices, preserved drafts, focus and retry behavior.](error-display-guide.md) - #Forms #Errors #Validation
- [Current action focus and board memory, plus the policy for main-screen replacements.](focus-policy.md) - #Input #Focus #Policy
- [Label associations, responsive field rows, text editing surfaces and load-notice layout.](form-layout-guide.md) - #Forms #Layout #Controls
- [Pointer, touch, keyboard and focus behavior](input.md) - #Game #Input
- [Populated interface review journeys and the source or browser evidence for each.](interface-review-checklist.md) - #Review #Testing #Controls
- [Name-length acceptance, Unicode counting units and boundary examples.](name-length-policy.md) - #Forms #Names #Unicode
- [Native element choices and the browser behavior retained around React callbacks.](native-controls-guide.md) - #Controls #Semantics #Architecture
- [Native click and tap activation, press timing and scrolling through large boards.](pointer-and-touch.md) - #Input #Pointer #Touch
- [Board-code drafts, snapshot editing, load outcomes, export and Resume behavior.](reproduction-panel.md) - #Controls #Forms #Sharing
- [A complete game through exposed names and states, with accessibility evidence limits.](screen-reader-notes.md) - #Input #Accessibility #Testing
- [The statistics definition list, counter sources, elapsed display and completion output.](status-bar.md) - #Controls #Status #Gameplay
- [The result-table markup policy and how it differs from current statistics and cards.](tables-policy.md) - #Controls #Semantics #Policy
- [The new-control size policy, existing CSS dimensions and rendered target measurement.](target-size-policy.md) - #Controls #Layout #Policy
- [Accepted name representation and its separation from board-code and JSON input.](text-entry-policy.md) - #Forms #Names #Policy

