---
open-forge:
  description: Gameplay scope for the board, turns, scoring, the clock, saved
    sizes and best scores
  tags:
    - Game
    - Gameplay
---
# Gameplay

Gameplay scope for the board, turns, scoring, the clock, saved sizes and best scores.

## Axioms

- inherited - No local axioms; loaded ancestor axioms remain active.

## Entries

- [Per-size best move comparison, preference validation, persistence, and imported-completion behavior.](best-score-records.md) - #Game #Gameplay #Persistence
- [The seven board sizes, exact card and pair counts, included faces, and size selection behavior.](board-size-catalogue.md) - #Game #Gameplay #Boards
- [Board-code parsing, paired deck construction, deterministic shuffle arithmetic, and fresh seed selection.](deck-generation.md) - #Game #Gameplay #Generation
- [Active-time accumulation, browser observations, display conversion, caps, and snapshot precision.](elapsed-time-rules.md) - #Game #Gameplay #Timing
- [GameState fields, invariants, derived values, immutable transitions, and session boundaries.](game-state-model.md) - #Game #Gameplay #State
- [Answers to common play and maintenance questions, with links to detailed behavior pages.](gameplay-faq.md) - #Game #Gameplay #FAQ
- [The exact 800-millisecond active interval, synchronization, pauses, and stale timer protection.](mismatch-interval.md) - #Game #Gameplay #Timing
- [What fresh deals, repeats, size changes, loads, Resume, exports, and reloads preserve or reset.](new-game-and-restart.md) - #Game #Gameplay #Sessions
- [Position indices versus face numbers, artwork identity dimensions, and hidden-face rendering.](pair-identity.md) - #Game #Gameplay #Faces
- [Card matching, moves, timing and victory rules](rules.md) - #Game #Rules
- [Pair progress, move accounting, minimum completions, and continued play at the move cap.](scoring-and-moves.md) - #Game #Gameplay #Scoring
- [The closed, one-card, and mismatch selection alternatives, visibility, and decoding boundaries.](selection-state.md) - #Game #Gameplay #State
- [Activation guards, second-reveal resolution, and the ordering of time, feedback, and turns.](turn-resolution.md) - #Game #Gameplay #Turns
- [Full matched coverage, the final transition, stopped time, and played versus imported completion.](win-conditions.md) - #Game #Gameplay #Completion

