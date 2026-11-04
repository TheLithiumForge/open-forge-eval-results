# Keyboard accessibility evidence

Chromium 156.0.8078.4, Playwright 1.64.1; automated accessibility tree via Locator.ariaSnapshot().

No screen reader was used. Spoken output remains user acceptance. Board: np1-4-1; controlled active clock: 0ms.

Native Tab entered the board after Restart. Arrow keys moved to both cards in every literal pair; Enter and Space revealed them. Matched cards remained focused and aria-disabled. Tab left for the reproduction summary; Shift+Tab returned to the remembered card, then reached New Game, which started another deal.

## Initial closed board

```yaml
- main:
  - heading "Neon Pairs" [level=1]
  - paragraph: Find every pair. Make every move count.
  - text: Grid size
  - combobox "Grid size":
    - option "4x4" [selected]
    - option "6x6"
    - option "8x8"
    - option "10x10"
    - option "12x12"
    - option "14x14"
    - option "16x16"
  - button "New Game"
  - button "Restart"
  - text: "Moves:"
  - strong: "0"
  - text: "Pairs:"
  - strong: 0/8
  - text: "Time:"
  - strong: 0:00
  - text: "Best:"
  - strong: none
  - region "Game board":
    - button "Row 1, column 1, closed"
    - button "Row 1, column 2, closed"
    - button "Row 1, column 3, closed"
    - button "Row 1, column 4, closed"
    - button "Row 2, column 1, closed"
    - button "Row 2, column 2, closed"
    - button "Row 2, column 3, closed"
    - button "Row 2, column 4, closed"
    - button "Row 3, column 1, closed"
    - button "Row 3, column 2, closed"
    - button "Row 3, column 3, closed"
    - button "Row 3, column 4, closed"
    - button "Row 4, column 1, closed"
    - button "Row 4, column 2, closed"
    - button "Row 4, column 3, closed"
    - button "Row 4, column 4, closed"
  - paragraph: Reveal two cards with a click or tap. Use arrow keys to move, Enter or Space to reveal.
  - group:
    - text: Reproduce a game
    - paragraph: A board code repeats a deal. A snapshot saves your progress.
    - text: Board code
    - textbox "Board code": np1-4-1
    - button "Load board"
    - text: Snapshot JSON
    - textbox "Snapshot JSON"
    - button "Export snapshot"
    - button "Load snapshot"
  - status
```

## First reveal

```yaml
- main:
  - heading "Neon Pairs" [level=1]
  - paragraph: Find every pair. Make every move count.
  - text: Grid size
  - combobox "Grid size":
    - option "4x4" [selected]
    - option "6x6"
    - option "8x8"
    - option "10x10"
    - option "12x12"
    - option "14x14"
    - option "16x16"
  - button "New Game"
  - button "Restart"
  - text: "Moves:"
  - strong: "0"
  - text: "Pairs:"
  - strong: 0/8
  - text: "Time:"
  - strong: 0:00
  - text: "Best:"
  - strong: none
  - region "Game board":
    - button "Row 1, column 1, cyan solid plus, marker top, revealed"
    - button "Row 1, column 2, closed"
    - button "Row 1, column 3, closed"
    - button "Row 1, column 4, closed"
    - button "Row 2, column 1, closed"
    - button "Row 2, column 2, closed"
    - button "Row 2, column 3, closed"
    - button "Row 2, column 4, closed"
    - button "Row 3, column 1, closed"
    - button "Row 3, column 2, closed"
    - button "Row 3, column 3, closed"
    - button "Row 3, column 4, closed"
    - button "Row 4, column 1, closed"
    - button "Row 4, column 2, closed"
    - button "Row 4, column 3, closed"
    - button "Row 4, column 4, closed"
  - paragraph: Reveal two cards with a click or tap. Use arrow keys to move, Enter or Space to reveal.
  - group:
    - text: Reproduce a game
    - paragraph: A board code repeats a deal. A snapshot saves your progress.
    - text: Board code
    - textbox "Board code": np1-4-1
    - button "Load board"
    - text: Snapshot JSON
    - textbox "Snapshot JSON"
    - button "Export snapshot"
    - button "Load snapshot"
  - status
```

## Exactly one announcement per turn

1. Pair found. 1 pair matched.
2. Pair found. 2 pairs matched.
3. Pair found. 3 pairs matched.
4. Pair found. 4 pairs matched.
5. Pair found. 5 pairs matched.
6. Pair found. 6 pairs matched.
7. Pair found. 7 pairs matched.
8. Pair found. All pairs found in 8 moves and 0:00.

The live region is polite and atomic. Separate browser checks cover consecutive identical misses and verify that time, focus and mismatch closure add no announcement.

## Completed board

```yaml
- main:
  - heading "Neon Pairs" [level=1]
  - paragraph: Find every pair. Make every move count.
  - text: Grid size
  - combobox "Grid size":
    - option "4x4" [selected]
    - option "6x6"
    - option "8x8"
    - option "10x10"
    - option "12x12"
    - option "14x14"
    - option "16x16"
  - button "New Game"
  - button "Restart"
  - text: "Moves:"
  - strong: "8"
  - text: "Pairs:"
  - strong: 8/8
  - text: "Time:"
  - strong: 0:00
  - text: "Best:"
  - strong: "8"
  - heading "All pairs found!" [level=2]
  - paragraph: Completed in 8 moves and 0:00.
  - region "Game board":
    - button "Row 1, column 1, cyan solid plus, marker top, matched" [disabled]
    - button "Row 1, column 2, cyan solid chevron, marker top, matched" [disabled]
    - button "Row 1, column 3, cyan solid circle, marker top, matched" [disabled]
    - button "Row 1, column 4, cyan solid hexagon, marker top, matched" [disabled]
    - button "Row 2, column 1, cyan solid triangle, marker top, matched" [disabled]
    - button "Row 2, column 2, cyan solid triangle, marker top, matched" [disabled]
    - button "Row 2, column 3, cyan solid circle, marker top, matched" [disabled]
    - button "Row 2, column 4, cyan solid hexagon, marker top, matched" [disabled]
    - button "Row 3, column 1, cyan solid diamond, marker top, matched" [disabled]
    - button "Row 3, column 2, cyan solid chevron, marker top, matched" [disabled]
    - button "Row 3, column 3, cyan solid square, marker top, matched" [disabled]
    - button "Row 3, column 4, cyan solid plus, marker top, matched" [disabled]
    - button "Row 4, column 1, cyan solid star, marker top, matched" [disabled]
    - button "Row 4, column 2, cyan solid star, marker top, matched" [disabled]
    - button "Row 4, column 3, cyan solid square, marker top, matched" [disabled]
    - button "Row 4, column 4, cyan solid diamond, marker top, matched" [disabled]
  - paragraph: Reveal two cards with a click or tap. Use arrow keys to move, Enter or Space to reveal.
  - group:
    - text: Reproduce a game
    - paragraph: A board code repeats a deal. A snapshot saves your progress.
    - text: Board code
    - textbox "Board code": np1-4-1
    - button "Load board"
    - text: Snapshot JSON
    - textbox "Snapshot JSON"
    - button "Export snapshot"
    - button "Load snapshot"
  - status: Pair found. All pairs found in 8 moves and 0:00.
```

## New Game through keyboard

```yaml
- main:
  - heading "Neon Pairs" [level=1]
  - paragraph: Find every pair. Make every move count.
  - text: Grid size
  - combobox "Grid size":
    - option "4x4" [selected]
    - option "6x6"
    - option "8x8"
    - option "10x10"
    - option "12x12"
    - option "14x14"
    - option "16x16"
  - button "New Game"
  - button "Restart"
  - text: "Moves:"
  - strong: "0"
  - text: "Pairs:"
  - strong: 0/8
  - text: "Time:"
  - strong: 0:00
  - text: "Best:"
  - strong: "8"
  - region "Game board":
    - button "Row 1, column 1, closed"
    - button "Row 1, column 2, closed"
    - button "Row 1, column 3, closed"
    - button "Row 1, column 4, closed"
    - button "Row 2, column 1, closed"
    - button "Row 2, column 2, closed"
    - button "Row 2, column 3, closed"
    - button "Row 2, column 4, closed"
    - button "Row 3, column 1, closed"
    - button "Row 3, column 2, closed"
    - button "Row 3, column 3, closed"
    - button "Row 3, column 4, closed"
    - button "Row 4, column 1, closed"
    - button "Row 4, column 2, closed"
    - button "Row 4, column 3, closed"
    - button "Row 4, column 4, closed"
  - paragraph: Reveal two cards with a click or tap. Use arrow keys to move, Enter or Space to reveal.
  - group:
    - text: Reproduce a game
    - paragraph: A board code repeats a deal. A snapshot saves your progress.
    - text: Board code
    - textbox "Board code": np1-4-240017070
    - button "Load board"
    - text: Snapshot JSON
    - textbox "Snapshot JSON"
    - button "Export snapshot"
    - button "Load snapshot"
  - status: Pair found. All pairs found in 8 moves and 0:00.
```
