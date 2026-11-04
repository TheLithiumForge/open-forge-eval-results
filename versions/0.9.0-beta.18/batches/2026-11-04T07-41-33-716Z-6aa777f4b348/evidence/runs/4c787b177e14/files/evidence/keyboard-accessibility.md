# Neon Pairs keyboard accessibility tree

- Browser: Chromium 156.0.8078.4
- Playwright: 1.64.1
- Journey: named Grid size and New Game controls; keyboard enter; closed and revealed names; all matched cards; final result and time; Tab exit; new deal.
- Screen reader: not used. Spoken-output confirmation remains user acceptance.

## Closed card name

- Row 1, column 1, closed

## Revealed card name

- Row 1, column 1, cyan solid plus, marker top, revealed

## Matched card name

- Row 2, column 1, cyan solid triangle, marker top, matched

## Turn announcements

- Pair found. 1 pair matched.
- Pair found. 2 pairs matched.
- Pair found. 3 pairs matched.
- Pair found. 4 pairs matched.
- Pair found. 5 pairs matched.
- Pair found. 6 pairs matched.
- Pair found. 7 pairs matched.
- Pair found. All pairs found in 8 moves and 0:00.

## Initial card-group accessibility snapshot

```yaml
- group "Memory cards":
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

## Completed game accessibility snapshot

```yaml
- main:
  - paragraph: A NEON TEST OF MEMORY
  - heading "Neon Pairs" [level=1]
  - paragraph: Turn over two cards. Find every matching pair.
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
      - text: "Pairs:"
      - strong: 8/8
    - paragraph:
      - text: "Moves:"
      - strong: "8"
    - paragraph:
      - text: "Time:"
      - strong: 0:00
    - paragraph:
      - text: "Best:"
      - strong: "8"
  - region "Game complete":
    - heading "All pairs found" [level=2]
    - paragraph: Completed in 8 moves and 0:00.
  - region "Game board":
    - region "Card board":
      - group "Memory cards":
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
    - paragraph: Choose a card, then uncover its match.
  - region "Reproduction controls":
    - group:
      - text: Reproduce a game Board code
      - textbox "Board code": np1-4-1
      - button "Load board"
      - text: Snapshot JSON
      - textbox "Snapshot JSON"
      - button "Export snapshot"
      - button "Load snapshot"
  - status: Pair found. All pairs found in 8 moves and 0:00.
```
