# Automated keyboard accessibility tree journey

Browser: Chromium 156.0.8078.4. Automation: Playwright 1.64.1.
No screen reader was used. Spoken output remains part of user acceptance.

The journey found Grid size and New Game by their accessible names, entered a deterministic 4x4 deal, entered the board with Tab, navigated and activated cards by keyboard, observed closed/revealed/matched names, verified turn and final-win live-region text in the DOM, left the board with Tab, and started another deal from the keyboard.

## Accessibility tree checkpoint 1

```yaml
- group "4 by 4 cards":
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
```

## Accessibility tree checkpoint 2

```yaml
- group "4 by 4 cards":
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
```

## Accessibility tree checkpoint 3

```yaml
- group "4 by 4 cards":
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
```

## Accessibility tree checkpoint 4

```yaml
- main:
  - paragraph: A MEMORY GAME
  - heading "NEON PAIRS" [level=1]
  - paragraph: Find every matching pair in as few moves as you can.
  - region "Game":
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
      - paragraph: ALL PAIRS FOUND
      - paragraph: Completed in 8 moves
      - paragraph: "Time: 0:00"
    - group "4 by 4 cards":
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
  - status: Pair found. All pairs found in 8 moves and 0:00.
  - group:
    - text: Reproduce a game Board code
    - textbox "Board code": np1-4-1
    - button "Load board"
    - text: Snapshot JSON
    - textbox "Snapshot JSON"
    - button "Export snapshot"
    - button "Load snapshot"
    - paragraph
  - text: Every face has a shape, marker and fill to help you remember it.
```
