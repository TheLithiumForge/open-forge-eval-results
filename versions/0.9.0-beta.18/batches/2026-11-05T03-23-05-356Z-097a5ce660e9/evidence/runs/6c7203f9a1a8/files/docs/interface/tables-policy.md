---
open-forge:
  description: Tournament bracket table semantics and how they differ from solo
    statistics and cards.
  tags:
    - Controls
    - Semantics
    - Policy
---

# Tables policy

This page records the markup policy for ordered result data and explains why the current game statistics use a different structure.

The solo UI uses a definition list for one game's statistics. Tournament uses an HTML table for bracket rows, with a caption and scoped column headings. The card board remains a CSS grid of buttons; those different structures serve different data.

## Policy for result data

When the content represents records with comparable columns, its relationships need to survive reading beyond the visual arrangement. CSS alone can align text while leaving those relationships absent from the document structure. Ranked or bracket data is a table element with a caption and th scope="col" header cells. The caption identifies the collection being read, while the column headers connect each record's values to their meaning.

This is a content-specific policy. It does not make the game board a data table because it has rows and columns, and it does not require converting every compact summary to tabular markup. The distinction begins with what the content means: interactive card coordinates, a property's value and a record in an ordered result collection are different things. [Native controls guide](native-controls-guide.md) discusses the broader preference for native semantics.

## Why the statistics are a definition list

GameStatus renders Moves, Pairs, Time and Best as four `dt`/`dd` groups inside a `dl`. Each term names a property of the same current game. There are no peer result rows and no column whose meaning changes with the row being read.

The layout happens to use flex and can wrap. At a wide width, those groups may look like cells in a horizontal strip. At a narrow width, they can flow to multiple lines. Neither visual arrangement changes the definition-list relationship. Replacing the wrapper with a table solely to preserve one desktop arrangement would confuse layout with content structure.

The Best value is one saved move count selected by current size. It does not present a list of people or a comparison across many records. `session.preferences.bestMoves[String(game.size)]` chooses the value before it reaches GameStatus. A single local best is not a table of ordered results.

[Status bar](status-bar.md) documents those expressions and labels. The present statistics model has no result columns.

## Why the card board is not a table

Board renders a named region containing an inner `div.board` and native card buttons. CSS Grid places those buttons in row order. Each card has its own coordinate and state in its accessible name, and keyboard movement follows a dedicated spatial model.

The table policy does not turn that interactive surface into a data table. A card is activated, can reveal a face and participates in remembered focus. A result cell is read as part of a record. They have different purposes even if both appear in a rectangle.

There is also no ARIA grid role on the current board. Its native buttons and movement handler implement the specified interaction without declaring a separate composite widget role. [Board keyboard navigation](board-keyboard-navigation.md) traces that behavior. A review of result markup should not accidentally rename or restructure the card controls because the word “row” appears in both contexts.

## What the caption contributes

An ordered collection needs context. A visible title elsewhere on a page can be helpful, but a table caption directly identifies the collection associated with the table. That matters when reading the table independently or navigating between document structures.

The bracket caption is “Tournament bracket.” A table's caption should identify the data the table presents; technical details about markup belong in documentation rather than product copy.

A caption also does not supply missing column meaning. A reader needs to know whether a number represents moves, a position in an ordering or another property. The required header cells carry the column relationships; the caption names the whole collection. Combining all labels into a caption would leave the row values harder to interpret.

## Column relationships and reading order

The `scope="col"` attribute makes the header's direction explicit. It communicates that the header applies to values down its column. A bold `td`, a styled `div` or text positioned above a column can look similar while having a different structure.

A reviewer can inspect the table DOM and the browser's accessibility representation separately from the screenshot. The screenshot establishes visible arrangement. The DOM establishes element choices and attributes. The accessibility view helps establish that the browser exposes a meaningful table structure. No single one of these views proves all aspects of the interface.

The current bracket does not use row headers, numeric sorting or other table controls. Its column order groups each player's moves and time beside that player's name, then gives the match winner its own column.

## Narrow layouts and long values

The current game separates outer page width from board overflow. The bracket has its own wrapper and horizontal overflow behavior in `tournament.css`; it cannot inherit the card board's scroll logic by sharing a class name. A table's relationship between headers and values remains meaningful when its viewport is narrow.

The bracket keeps its columns and can scroll horizontally when its minimum width exceeds the viewport. The DOM relationships remain intact while scrolling, and the two player result groups stay beside their names. Both that structure and its visible narrow-layout behavior are relevant review evidence.

Name text can also vary in width without changing its accepted value. Typography and wrapping are layout concerns. The name policies remain separate from table structure; accepted names retain their displayed representation. [Typography](../visuals/typography.md) and [Form layout guide](form-layout-guide.md) explain nearby layout decisions in the existing interface.

The existing accessibility journey covers game controls and completion, but does not establish browser accessibility-tree exposure for the tournament table. A review of the bracket should inspect its actual markup and readable rows; solo statistics checks cannot establish that structure. [Accessibility audit](../quality/accessibility-audit.md) provides the wider review context.
