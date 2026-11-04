# Automated accessibility tree evidence

Browser: Chromium 156.0.8078.4; Playwright: 1.64.1; viewport: 1280x720 CSS pixels.
Screen reader spoken output was not tested. Spoken confirmation remains part of user acceptance.

## Named controls

```yaml
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
  - paragraph: "Moves: 0 Pairs: 0/8 Time: 0:00 Best: none"
```

## Closed and revealed card names

```yaml
- button "Row 1, column 1, closed"
- button "Row 1, column 1, cyan solid triangle, marker top, revealed"
```

## Match and win announcements

```yaml
- status: Pair found. 1 pair matched.
- status: Pair found. All pairs found in 8 moves and 0:01.
- paragraph: You won in 8 moves and 0:01.
```