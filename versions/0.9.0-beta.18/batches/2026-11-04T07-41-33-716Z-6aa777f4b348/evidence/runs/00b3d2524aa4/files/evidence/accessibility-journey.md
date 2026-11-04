# Automated accessibility tree evidence

Browser: Chromium 156.0.8078.4, Playwright 1.64.1.
Screen reader used: no. Spoken-output review remains user acceptance.

## Initial game tree

```yaml
- main:
  - paragraph: A little memory goes a long way
  - heading "Neon Pairs" [level=1]
  - paragraph: Choose a size, then tap, press Enter or Space to reveal a card. Use arrow keys to move.
  - region "Game controls":
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
  - region "Game status":
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
  - group "Game board":
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
  - group: Reproduce a game
```

## Revealed card tree

```yaml
- main:
  - paragraph: A little memory goes a long way
  - heading "Neon Pairs" [level=1]
  - paragraph: Choose a size, then tap, press Enter or Space to reveal a card. Use arrow keys to move.
  - region "Game controls":
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
  - region "Game status":
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
  - text: Board loaded.
  - group "Game board":
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
    - text: Reproduce a game Board code
    - textbox "Board code": np1-4-1
    - button "Load board"
    - text: Snapshot JSON
    - textbox "Snapshot JSON"
    - button "Export snapshot"
    - button "Load snapshot"
```

## Completed keyboard game tree

```yaml
- main:
  - paragraph: A little memory goes a long way
  - heading "Neon Pairs" [level=1]
  - paragraph: Choose a size, then tap, press Enter or Space to reveal a card. Use arrow keys to move.
  - region "Game controls":
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
  - region "Game status":
    - paragraph:
      - text: "Moves:"
      - strong: "8"
    - paragraph:
      - text: "Pairs:"
      - strong: 8/8
    - paragraph:
      - text: "Time:"
      - strong: 0:01
    - paragraph:
      - text: "Best:"
      - strong: "8"
  - text: Pair found. All pairs found in 8 moves and 0:01.
  - paragraph: All pairs found in 8 moves and 0:01.
  - group "Game board":
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
```
