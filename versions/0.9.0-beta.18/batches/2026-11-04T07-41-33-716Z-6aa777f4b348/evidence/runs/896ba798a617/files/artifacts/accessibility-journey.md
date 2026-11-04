# Automated keyboard accessibility journey

Playwright 1.64.1; Chromium 156.0.8078.4; no screen reader used.

The test completed eight pairs using only arrow keys, Enter and Space after loading np1-4-1, checked one announcement per turn, left with Tab and started a new game. Spoken output remains user acceptance.

## Closed board

```yaml
- main:
  - heading "Neon Pairs" [level=1]
  - paragraph: Find every pair. Remember the shapes, markers and fills.
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
  - paragraph:
    - text: "Moves:"
    - strong: "0"
  - paragraph:
    - text: "Pairs:"
    - strong: 0/8
  - paragraph:
    - text: "Time:"
    - strong: 0:00
  - paragraph:
    - text: "Best:"
    - strong: none
  - paragraph: Reveal two cards at a time. Use arrow keys to move, Enter or Space to reveal.
  - group "Card board":
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
  - group:
    - text: Reproduce a game
    - paragraph: Repeat a deal with its board code, or save your progress as a snapshot.
    - text: Board code
    - textbox "Board code": np1-4-1
    - button "Load board"
    - paragraph: Loaded board.
    - text: Snapshot JSON
    - textbox "Snapshot JSON"
    - button "Export snapshot"
    - button "Load snapshot"
  - text: Loaded board.
```

## First revealed face

```yaml
- main:
  - heading "Neon Pairs" [level=1]
  - paragraph: Find every pair. Remember the shapes, markers and fills.
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
  - paragraph:
    - text: "Moves:"
    - strong: "0"
  - paragraph:
    - text: "Pairs:"
    - strong: 0/8
  - paragraph:
    - text: "Time:"
    - strong: 0:00
  - paragraph:
    - text: "Best:"
    - strong: none
  - paragraph: Reveal two cards at a time. Use arrow keys to move, Enter or Space to reveal.
  - group "Card board":
    - button "Row 1, column 1, closed"
    - button "Row 1, column 2, closed"
    - button "Row 1, column 3, cyan solid circle, marker top, revealed"
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
  - group:
    - text: Reproduce a game
    - paragraph: Repeat a deal with its board code, or save your progress as a snapshot.
    - text: Board code
    - textbox "Board code": np1-4-1
    - button "Load board"
    - paragraph: Loaded board.
    - text: Snapshot JSON
    - textbox "Snapshot JSON"
    - button "Export snapshot"
    - button "Load snapshot"
  - text: Loaded board.
```

## Completion

```yaml
- main:
  - heading "Neon Pairs" [level=1]
  - paragraph: Find every pair. Remember the shapes, markers and fills.
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
  - paragraph:
    - text: "Moves:"
    - strong: "8"
  - paragraph:
    - text: "Pairs:"
    - strong: 8/8
  - paragraph:
    - text: "Time:"
    - strong: 0:00
  - paragraph:
    - text: "Best:"
    - strong: "8"
  - heading "All pairs found!" [level=2]
  - paragraph: Finished in 8 moves and 0:00.
  - paragraph: Reveal two cards at a time. Use arrow keys to move, Enter or Space to reveal.
  - group "Card board":
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
  - group:
    - text: Reproduce a game
    - paragraph: Repeat a deal with its board code, or save your progress as a snapshot.
    - text: Board code
    - textbox "Board code": np1-4-1
    - button "Load board"
    - paragraph: Loaded board.
    - text: Snapshot JSON
    - textbox "Snapshot JSON"
    - button "Export snapshot"
    - button "Load snapshot"
  - text: Pair found. All pairs found in 8 moves and 0:00.
```
