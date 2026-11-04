# Keyboard accessibility journey

Chromium 156.0.8078.4, Playwright 1.64.1; no screen reader used.

## Hidden board

```yaml
- main:
  - heading "Neon Pairs" [level=1]
  - paragraph: Find every pair in as few moves as you can.
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
  - region "Play":
    - paragraph: Arrow keys move. Enter or Space reveals a card.
    - group "Memory board":
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

## First revealed face

```yaml
- button "Row 2, column 4, cyan solid circle, marker top, revealed"
```

## Turn 1

Pair found. 1 pair matched.

## Turn 2

Pair found. 2 pairs matched.

## Turn 3

Pair found. 3 pairs matched.

## Turn 4

Pair found. 4 pairs matched.

## Turn 5

Pair found. 5 pairs matched.

## Turn 6

Pair found. 6 pairs matched.

## Turn 7

Pair found. 7 pairs matched.

## Turn 8

Pair found. All pairs found in 8 moves and 0:00.

## Complete board and final summary

```yaml
- main:
  - heading "Neon Pairs" [level=1]
  - paragraph: Find every pair in as few moves as you can.
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
      - strong: 0:00
    - paragraph:
      - text: "Best:"
      - strong: "8"
    - region "All pairs found!":
      - heading "All pairs found!" [level=2]
      - paragraph: Finished in 8 moves and 0:00.
  - region "Play":
    - paragraph: Arrow keys move. Enter or Space reveals a card.
    - group "Memory board":
      - button "Row 1, column 1, cyan solid square, marker top, matched" [disabled]
      - button "Row 1, column 2, cyan solid square, marker top, matched" [disabled]
      - button "Row 1, column 3, cyan solid chevron, marker top, matched" [disabled]
      - button "Row 1, column 4, cyan solid star, marker top, matched" [disabled]
      - button "Row 2, column 1, cyan solid plus, marker top, matched" [disabled]
      - button "Row 2, column 2, cyan solid chevron, marker top, matched" [disabled]
      - button "Row 2, column 3, cyan solid hexagon, marker top, matched" [disabled]
      - button "Row 2, column 4, cyan solid circle, marker top, matched" [disabled]
      - button "Row 3, column 1, cyan solid triangle, marker top, matched" [disabled]
      - button "Row 3, column 2, cyan solid star, marker top, matched" [disabled]
      - button "Row 3, column 3, cyan solid triangle, marker top, matched" [disabled]
      - button "Row 3, column 4, cyan solid circle, marker top, matched" [disabled]
      - button "Row 4, column 1, cyan solid diamond, marker top, matched" [disabled]
      - button "Row 4, column 2, cyan solid hexagon, marker top, matched" [disabled]
      - button "Row 4, column 3, cyan solid plus, marker top, matched" [disabled]
      - button "Row 4, column 4, cyan solid diamond, marker top, matched" [disabled]
  - group: Reproduce a game
  - text: Pair found. All pairs found in 8 moves and 0:00.
```

## New game from keyboard

```yaml
- main:
  - heading "Neon Pairs" [level=1]
  - paragraph: Find every pair in as few moves as you can.
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
      - strong: "8"
  - region "Play":
    - paragraph: Arrow keys move. Enter or Space reveals a card.
    - group "Memory board":
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
