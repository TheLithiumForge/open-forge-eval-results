# Keyboard accessibility evidence

Playwright 1.64.1; Chromium 156.0.8078.4; Node v26.12.1.
No screen reader was used. Spoken confirmation remains user acceptance.

## Closed board

```yaml
- main:
  - heading "Neon Pairs" [level=1]
  - paragraph: A little focus. Every pair.
  - paragraph: Find the pairs. Reveal two cards. Remember what you see.
  - text: 4 × 4 Grid size
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
  - paragraph: Click or tap to reveal · Arrow keys to move · Enter or Space to reveal
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
  - text: Take your time. Make it memorable.
```

## First revealed face

```yaml
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
```

## Completed game

```yaml
- main:
  - heading "Neon Pairs" [level=1]
  - paragraph: A little focus. Every pair.
  - paragraph: Find the pairs. Reveal two cards. Remember what you see.
  - text: 4 × 4 Grid size
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
  - strong: 0:07
  - text: "Best:"
  - strong: "8"
  - strong: All pairs found.
  - text: 8 moves · 0:07
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
  - paragraph: Click or tap to reveal · Arrow keys to move · Enter or Space to reveal
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
  - text: Take your time. Make it memorable. Pair found. All pairs found in 8 moves and 0:07.
```

Native Tab left the board; Shift+Tab returned to its remembered card, then reached Restart and New Game. Enter started a hidden deal.
