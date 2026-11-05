---
open-forge:
  description: The result-table markup policy and how it differs from current
    statistics and cards.
  tags:
    - Controls
    - Semantics
    - Policy
---
# Tables policy

This page records the markup policy for ordered result data and explains why the current game statistics use a different structure.

The Tournament screen displays match and player results in a bracket table. `GameStatus.tsx` still displays four properties of a single game in a definition list. Reproduction controls use forms, and the board is a CSS grid of buttons; those are separate structures with separate meanings.

## Policy for result data

When the content represents records with comparable columns, its relationships need to survive reading beyond the visual arrangement. CSS alone can align text while leaving those relationships absent from the document structure. Ranked or bracket data is a table element with a caption and th scope="col" header cells. The caption identifies the collection being read, while the column headers connect each record's values to their meaning.

This is a content-specific policy. It does not make the game board a data table because it has rows and columns, and it does not require converting every compact summary to tabular markup. The distinction begins with what the content means: interactive card coordinates, a property's value and a record in an ordered result collection are different things.

`TournamentLive.tsx` uses this policy for the active and finished bracket. [Native controls guide](native-controls-guide.md) discusses the broader preference for native semantics without adding another result format.

## Why the statistics are a definition list

GameStatus renders Moves, Pairs, Time and Best as four `dt`/`dd` groups inside a `dl`. Each term names a property of the same current game. There are no peer result rows and no column whose meaning changes with the row being read.

The layout happens to use flex and can wrap. At a wide width, those groups may look like cells in a horizontal strip. At a narrow width, they can flow to multiple lines. Neither visual arrangement changes the definition-list relationship. Replacing the wrapper with a table solely to preserve one desktop arrangement would confuse layout with content structure.

The Best value is one saved move count selected by current size. It does not present a list of people or a comparison across many records. `session.preferences.bestMoves[String(game.size)]` chooses the value before it reaches GameStatus. Tournament results are the separate ordered-result view.

[Status bar](status-bar.md) documents those expressions and labels. The present statistics model has no result columns.

## Why the card board is not a table

Board renders a named region containing an inner `div.board` and native card buttons. CSS Grid places those buttons in row order. Each card has its own coordinate and state in its accessible name, and keyboard movement follows a dedicated spatial model.

The table policy does not turn that interactive surface into a data table. A card is activated, can reveal a face and participates in remembered focus. A result cell is read as part of a record. They have different purposes even if both appear in a rectangle.

There is also no ARIA grid role on the current board. Its native buttons and movement handler implement the specified interaction without declaring a separate composite widget role. [Board keyboard navigation](board-keyboard-navigation.md) traces that behavior. A review of result markup should not accidentally rename or restructure the card controls because the word “row” appears in both contexts.

## What the caption contributes

An ordered collection needs context. A visible title elsewhere on a page can be helpful, but a table caption directly identifies the collection associated with the table. That matters when reading the table independently or navigating between document structures.

The table caption is “Tournament bracket” for an active event and “Past tournament bracket” for a saved event. It names the collection when read outside its surrounding heading.

A caption also does not supply missing column meaning. A reader needs to know whether a number represents moves, a position in an ordering or another property. The required header cells carry the column relationships; the caption names the whole collection. Combining all labels into a caption would leave the row values harder to interpret.

## Column relationships and reading order

The `scope="col"` attribute makes the header's direction explicit. It communicates that the header applies to values down its column. A bold `td`, a styled `div` or text positioned above a column can look similar while having a different structure.

A reviewer can inspect the table DOM and the browser's accessibility representation separately from the screenshot. The screenshot establishes visible arrangement. The DOM establishes element choices and attributes. The accessibility view helps establish that the browser exposes a meaningful table structure. No single one of these views proves all aspects of the interface.

The bracket uses row headers for round, match number and player. Each player's row shows moves and formatted time; the match winner spans both player rows. Sorting controls are not part of this result view.

## Narrow layouts and long values

The current game already separates outer page width from board overflow. Bracket data has its own content and width behavior; it cannot simply inherit the card board's scroll logic by sharing a class name. A table's relationship between headers and values remains meaningful even when its viewport is narrow.

The bracket table has a 620px minimum width inside its own horizontal scroll wrapper. A reviewer can observe whether values remain readable and associated with their headers at narrow widths. Changing a collection into a stack of unrelated labels solely at a breakpoint can affect more than appearance, so both DOM and visual behavior are relevant evidence.

Name text can also vary in width without changing its accepted value. Typography and wrapping are layout concerns. The name policies remain separate from table structure; accepted names retain their displayed representation. [Typography](../visuals/typography.md) and [Form layout guide](form-layout-guide.md) explain nearby layout decisions in the existing interface.

`tests/tournament.e2e.test.ts` checks that the bracket's Winner column is exposed as a table header. The visible rows pair each player's moves and time with the match winner. [Accessibility audit](../quality/accessibility-audit.md) provides the wider review context.
