# Automated accessibility tree evidence

Captured from the Chromium keyboard journey in tests/accessibility.spec.ts using Playwright's ariaSnapshot().

## Closed cards

~~~yaml
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
~~~

## Revealed card

~~~yaml
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
~~~

## Matched cards

~~~yaml
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
~~~
