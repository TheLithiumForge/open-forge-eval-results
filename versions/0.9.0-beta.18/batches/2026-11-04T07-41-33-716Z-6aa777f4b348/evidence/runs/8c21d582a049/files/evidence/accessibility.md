# Keyboard accessibility-tree evidence

Playwright 1.64.1; Chromium 156.0.8078.4. No screen reader used.

This automated journey uses native keyboard actions and the built distribution. Spoken output remains user acceptance.

## Start: named controls and closed positions

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
  - group "4 by 4 card board":
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
  - paragraph: Reveal two cards at a time. Use arrow keys to move, Enter or Space to reveal, and Tab to leave the board.
  - group: Reproduce a game
  - status
```

## First reveal: face name and state

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
  - group "4 by 4 card board":
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
  - paragraph: Reveal two cards at a time. Use arrow keys to move, Enter or Space to reveal, and Tab to leave the board.
  - group: Reproduce a game
  - status
```

## First match: focusable matched cards and one turn result

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
    - strong: "1"
  - paragraph:
    - text: "Pairs:"
    - strong: 1/8
  - paragraph:
    - text: "Time:"
    - strong: 0:00
  - paragraph:
    - text: "Best:"
    - strong: none
  - group "4 by 4 card board":
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
  - paragraph: Reveal two cards at a time. Use arrow keys to move, Enter or Space to reveal, and Tab to leave the board.
  - group: Reproduce a game
  - status: Pair found. 1 pair matched.
```

## Final match: unified result, win banner, moves and time

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
  - region "Game complete":
    - heading "All pairs found!" [level=2]
    - paragraph: Finished in 8 moves and 0:00.
  - group "4 by 4 card board":
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
  - paragraph: Reveal two cards at a time. Use arrow keys to move, Enter or Space to reveal, and Tab to leave the board.
  - group: Reproduce a game
  - status: Pair found. All pairs found in 8 moves and 0:00.
```

## Native Tab exit and another game

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
    - strong: "8"
  - group "4 by 4 card board":
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
  - paragraph: Reveal two cards at a time. Use arrow keys to move, Enter or Space to reveal, and Tab to leave the board.
  - group: Reproduce a game
  - status
```

## Turn event log

```json
[
  "Pair found. 1 pair matched.",
  "Pair found. 2 pairs matched.",
  "Pair found. 3 pairs matched.",
  "Pair found. 4 pairs matched.",
  "Pair found. 5 pairs matched.",
  "Pair found. 6 pairs matched.",
  "Pair found. 7 pairs matched.",
  "Pair found. All pairs found in 8 moves and 0:00."
]
```
