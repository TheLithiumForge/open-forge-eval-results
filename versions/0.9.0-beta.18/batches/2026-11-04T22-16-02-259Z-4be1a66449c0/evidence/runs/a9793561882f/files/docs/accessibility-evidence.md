# Automated accessibility-tree evidence

Chromium 156.0.8078.4, Playwright 1.64.1. These snapshots were captured from the offline HTML. No screen reader was used; spoken output remains for user acceptance. The board code was `np1-4-1`.

## Starting board and named controls

```yaml
- main:
  - heading "Neon Pairs" [level=1]
  - paragraph: Find every matching pair in as few moves as you can.
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
  - text: "Moves: 0 Pairs: 0/8 Time: 0:00 Best: none"
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
    - text: Reproduce a game Board code
    - textbox "Board code": np1-4-1
    - button "Load board"
    - text: Snapshot JSON
    - textbox "Snapshot JSON"
    - button "Export snapshot"
    - button "Load snapshot"
    - paragraph: Loaded board.
  - status
```

## First revealed card

```yaml
- main:
  - heading "Neon Pairs" [level=1]
  - paragraph: Find every matching pair in as few moves as you can.
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
  - text: "Moves: 0 Pairs: 0/8 Time: 0:00 Best: none"
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
  - group:
    - text: Reproduce a game Board code
    - textbox "Board code": np1-4-1
    - button "Load board"
    - text: Snapshot JSON
    - textbox "Snapshot JSON"
    - button "Export snapshot"
    - button "Load snapshot"
    - paragraph: Loaded board.
  - status: Loaded board.
```

## First matching pair

```yaml
- main:
  - heading "Neon Pairs" [level=1]
  - paragraph: Find every matching pair in as few moves as you can.
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
  - text: "Moves: 1 Pairs: 1/8 Time: 0:00 Best: none"
  - button "Row 1, column 1, cyan solid plus, marker top, matched" [disabled]
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
  - button "Row 3, column 4, cyan solid plus, marker top, matched" [disabled]
  - button "Row 4, column 1, closed"
  - button "Row 4, column 2, closed"
  - button "Row 4, column 3, closed"
  - button "Row 4, column 4, closed"
  - group:
    - text: Reproduce a game Board code
    - textbox "Board code": np1-4-1
    - button "Load board"
    - text: Snapshot JSON
    - textbox "Snapshot JSON"
    - button "Export snapshot"
    - button "Load snapshot"
    - paragraph: Loaded board.
  - status: Pair found. 1 pair matched.
```

## Final match and completion

```yaml
- main:
  - heading "Neon Pairs" [level=1]
  - paragraph: Find every matching pair in as few moves as you can.
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
  - text: "Moves: 8 Pairs: 8/8 Time: 0:00 Best: 8 All pairs found! 8 moves · 0:00"
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
    - text: Reproduce a game Board code
    - textbox "Board code": np1-4-1
    - button "Load board"
    - text: Snapshot JSON
    - textbox "Snapshot JSON"
    - button "Export snapshot"
    - button "Load snapshot"
    - paragraph: Loaded board.
  - status: Pair found. All pairs found in 8 moves and 0:00.
```

After Tab, focus was on: Reproduce a game. New Game remained available by name.
