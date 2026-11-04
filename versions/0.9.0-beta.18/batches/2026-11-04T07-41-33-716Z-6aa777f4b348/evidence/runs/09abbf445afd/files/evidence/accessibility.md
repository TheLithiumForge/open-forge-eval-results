# Keyboard accessibility evidence

Browser: Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/156.0.8078.4 Safari/537.36
Automation: Playwright 1.64.1, Chromium 156.0.8078.4
Journey: 4×4 keyboard game using native buttons, arrow keys, Enter, and Tab.
Screen reader used: No. Spoken output remains for user acceptance.

## Initial board

```yaml
- main:
  - paragraph: A memory match game
  - heading "Neon Pairs" [level=1]
  - paragraph: Find every pair. Remember each shape, marker, and fill.
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
    - paragraph: "Moves: 0"
    - paragraph: "Pairs: 0/8"
    - paragraph: "Time: 0:00"
    - paragraph: "Best: none"
  - paragraph: Choose a card, then find its match. Use the arrow keys to move around the board.
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
  - group:
    - text: Reproduce a game Board code
    - textbox "Board code": np1-4-1
    - button "Load board"
    - text: Snapshot JSON
    - textbox "Snapshot JSON"
    - button "Export snapshot"
    - button "Load snapshot"
    - paragraph: Board loaded.
  - paragraph: This game is silent. Card states and turn results appear on screen.
  - status: Board loaded.
```
## Revealed card

```yaml
- main:
  - paragraph: A memory match game
  - heading "Neon Pairs" [level=1]
  - paragraph: Find every pair. Remember each shape, marker, and fill.
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
    - paragraph: "Moves: 0"
    - paragraph: "Pairs: 0/8"
    - paragraph: "Time: 0:00"
    - paragraph: "Best: none"
  - paragraph: Choose a card, then find its match. Use the arrow keys to move around the board.
  - group "4 by 4 cards":
    - button "Row 1, column 1, closed"
    - button "Row 1, column 2, closed"
    - button "Row 1, column 3, closed"
    - button "Row 1, column 4, closed"
    - button "Row 2, column 1, cyan solid triangle, marker top, revealed"
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
    - paragraph: Board loaded.
  - paragraph: This game is silent. Card states and turn results appear on screen.
  - status: Board loaded.
```
## First match

```yaml
- main:
  - paragraph: A memory match game
  - heading "Neon Pairs" [level=1]
  - paragraph: Find every pair. Remember each shape, marker, and fill.
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
    - paragraph: "Moves: 1"
    - paragraph: "Pairs: 1/8"
    - paragraph: "Time: 0:00"
    - paragraph: "Best: none"
  - paragraph: Choose a card, then find its match. Use the arrow keys to move around the board.
  - group "4 by 4 cards":
    - button "Row 1, column 1, closed"
    - button "Row 1, column 2, closed"
    - button "Row 1, column 3, closed"
    - button "Row 1, column 4, closed"
    - button "Row 2, column 1, cyan solid triangle, marker top, matched" [disabled]
    - button "Row 2, column 2, cyan solid triangle, marker top, matched" [disabled]
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
    - paragraph: Board loaded.
  - paragraph: This game is silent. Card states and turn results appear on screen.
  - status: Pair found. 1 pair matched.
```
## Mismatch

```yaml
- main:
  - paragraph: A memory match game
  - heading "Neon Pairs" [level=1]
  - paragraph: Find every pair. Remember each shape, marker, and fill.
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
    - paragraph: "Moves: 2"
    - paragraph: "Pairs: 1/8"
    - paragraph: "Time: 0:00"
    - paragraph: "Best: none"
  - paragraph: Choose a card, then find its match. Use the arrow keys to move around the board.
  - group "4 by 4 cards":
    - button "Row 1, column 1, closed" [disabled]
    - button "Row 1, column 2, closed" [disabled]
    - button "Row 1, column 3, cyan solid circle, marker top, revealed" [disabled]
    - button "Row 1, column 4, cyan solid hexagon, marker top, revealed" [disabled]
    - button "Row 2, column 1, cyan solid triangle, marker top, matched" [disabled]
    - button "Row 2, column 2, cyan solid triangle, marker top, matched" [disabled]
    - button "Row 2, column 3, closed" [disabled]
    - button "Row 2, column 4, closed" [disabled]
    - button "Row 3, column 1, closed" [disabled]
    - button "Row 3, column 2, closed" [disabled]
    - button "Row 3, column 3, closed" [disabled]
    - button "Row 3, column 4, closed" [disabled]
    - button "Row 4, column 1, closed" [disabled]
    - button "Row 4, column 2, closed" [disabled]
    - button "Row 4, column 3, closed" [disabled]
    - button "Row 4, column 4, closed" [disabled]
  - group:
    - text: Reproduce a game Board code
    - textbox "Board code": np1-4-1
    - button "Load board"
    - text: Snapshot JSON
    - textbox "Snapshot JSON"
    - button "Export snapshot"
    - button "Load snapshot"
    - paragraph: Board loaded.
  - paragraph: This game is silent. Card states and turn results appear on screen.
  - status: No match. Cards close after a short pause.
```
## Completed game

```yaml
- main:
  - paragraph: A memory match game
  - heading "Neon Pairs" [level=1]
  - paragraph: Find every pair. Remember each shape, marker, and fill.
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
    - paragraph: "Moves: 10"
    - paragraph: "Pairs: 8/8"
    - paragraph: "Time: 0:01"
    - paragraph: "Best: 10"
  - region "Game complete":
    - heading "Every pair found" [level=2]
    - paragraph: Finished in 10 moves and 0:01.
  - paragraph: Choose a card, then find its match. Use the arrow keys to move around the board.
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
  - group:
    - text: Reproduce a game Board code
    - textbox "Board code": np1-4-1
    - button "Load board"
    - text: Snapshot JSON
    - textbox "Snapshot JSON"
    - button "Export snapshot"
    - button "Load snapshot"
    - paragraph: Board loaded.
  - paragraph: This game is silent. Card states and turn results appear on screen.
  - status: Pair found. All pairs found in 10 moves and 0:01.
```
## Board exit and next game

Focus after starting another game by keyboard: New Game

```yaml
- main:
  - paragraph: A memory match game
  - heading "Neon Pairs" [level=1]
  - paragraph: Find every pair. Remember each shape, marker, and fill.
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
    - paragraph: "Moves: 0"
    - paragraph: "Pairs: 0/8"
    - paragraph: "Time: 0:00"
    - paragraph: "Best: 10"
  - paragraph: Choose a card, then find its match. Use the arrow keys to move around the board.
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
  - group:
    - text: Reproduce a game Board code
    - textbox "Board code": np1-4-2046845674
    - button "Load board"
    - text: Snapshot JSON
    - textbox "Snapshot JSON"
    - button "Export snapshot"
    - button "Load snapshot"
    - paragraph
  - paragraph: This game is silent. Card states and turn results appear on screen.
  - status: Pair found. All pairs found in 10 moves and 0:01.
```
