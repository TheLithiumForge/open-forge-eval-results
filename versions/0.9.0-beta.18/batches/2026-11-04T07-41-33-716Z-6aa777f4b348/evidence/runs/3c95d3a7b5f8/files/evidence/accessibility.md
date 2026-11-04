# Keyboard accessibility evidence

Playwright 1.64.1; Chromium 156.0.8078.4; Node v26.12.1.
No screen reader was used. These are browser accessibility-tree snapshots; spoken output remains user acceptance.

Journey: find Grid size and New Game by name, activate New Game, load documented code np1-4-1, Tab into the board,
move with arrows, reveal every pair with Enter and Space, Tab out, return to New Game, and start another deal.

## Initial closed board

```yaml
- main:
  - heading "Neon Pairs" [level=1]
  - paragraph: Reveal two cards. Remember their faces. Find every pair.
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
  - group "Game statistics":
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
  - region "Find the pairs":
    - heading "Find the pairs" [level=2]
    - paragraph: Arrow keys to move · Enter or Space to reveal
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
    - paragraph: Matches stay face up. A miss closes after a short pause.
  - group:
    - text: Reproduce a game
    - paragraph: Repeat a deal with its board code, or save your progress in a snapshot.
    - text: Board code
    - textbox "Board code": np1-4-1
    - button "Load board"
    - text: Snapshot JSON
    - textbox "Snapshot JSON"
    - paragraph: Export, then select and copy the JSON to keep it. Load a snapshot to restore it.
    - button "Export snapshot"
    - button "Load snapshot"
    - paragraph: Loaded board.
  - text: Loaded board.
```

## First revealed face

```yaml
- main:
  - heading "Neon Pairs" [level=1]
  - paragraph: Reveal two cards. Remember their faces. Find every pair.
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
  - group "Game statistics":
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
  - region "Find the pairs":
    - heading "Find the pairs" [level=2]
    - paragraph: Arrow keys to move · Enter or Space to reveal
    - group "Memory board":
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
    - paragraph: Matches stay face up. A miss closes after a short pause.
  - group:
    - text: Reproduce a game
    - paragraph: Repeat a deal with its board code, or save your progress in a snapshot.
    - text: Board code
    - textbox "Board code": np1-4-1
    - button "Load board"
    - text: Snapshot JSON
    - textbox "Snapshot JSON"
    - paragraph: Export, then select and copy the JSON to keep it. Load a snapshot to restore it.
    - button "Export snapshot"
    - button "Load snapshot"
    - paragraph: Loaded board.
  - text: Loaded board.
```

## Completed game

```yaml
- main:
  - heading "Neon Pairs" [level=1]
  - paragraph: Reveal two cards. Remember their faces. Find every pair.
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
  - group "Game statistics":
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
  - region "Game complete":
    - heading "All pairs found!" [level=2]
    - paragraph: Finished in 8 moves and 0:01.
  - region "Find the pairs":
    - heading "Find the pairs" [level=2]
    - paragraph: Arrow keys to move · Enter or Space to reveal
    - group "Memory board":
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
    - paragraph: Matches stay face up. A miss closes after a short pause.
  - group:
    - text: Reproduce a game
    - paragraph: Repeat a deal with its board code, or save your progress in a snapshot.
    - text: Board code
    - textbox "Board code": np1-4-1
    - button "Load board"
    - text: Snapshot JSON
    - textbox "Snapshot JSON"
    - paragraph: Export, then select and copy the JSON to keep it. Load a snapshot to restore it.
    - button "Export snapshot"
    - button "Load snapshot"
    - paragraph: Loaded board.
  - text: Pair found. All pairs found in 8 moves and 0:01.
```

## New deal after native Tab exit

```yaml
- main:
  - heading "Neon Pairs" [level=1]
  - paragraph: Reveal two cards. Remember their faces. Find every pair.
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
  - group "Game statistics":
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
  - region "Find the pairs":
    - heading "Find the pairs" [level=2]
    - paragraph: Arrow keys to move · Enter or Space to reveal
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
    - paragraph: Matches stay face up. A miss closes after a short pause.
  - group:
    - text: Reproduce a game
    - paragraph: Repeat a deal with its board code, or save your progress in a snapshot.
    - text: Board code
    - textbox "Board code": np1-4-1260253572
    - button "Load board"
    - text: Snapshot JSON
    - textbox "Snapshot JSON"
    - paragraph: Export, then select and copy the JSON to keep it. Load a snapshot to restore it.
    - button "Export snapshot"
    - button "Load snapshot"
```

## Turn announcements

1. Pair found. 1 pair matched.
2. Pair found. 2 pairs matched.
3. Pair found. 3 pairs matched.
4. Pair found. 4 pairs matched.
5. Pair found. 5 pairs matched.
6. Pair found. 6 pairs matched.
7. Pair found. 7 pairs matched.
8. Pair found. All pairs found in 8 moves and 0:01.

Each turn produced exactly one live-region mutation. The final event combines the match and victory.
Clock advancement, focus changes, and activating a matched card produced no further turn announcements.
