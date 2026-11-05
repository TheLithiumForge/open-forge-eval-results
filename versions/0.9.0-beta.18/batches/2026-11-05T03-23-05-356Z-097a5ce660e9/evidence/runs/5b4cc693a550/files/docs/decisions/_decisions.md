---
open-forge:
  description: Decisions scope for the numbered decision records, including superseded ones
  tags:
    - Game
    - Decisions
---
# Decisions

Decisions scope for the numbered decision records, including superseded ones.

## Axioms

- inherited - No local axioms; loaded ancestor axioms remain active.

## Entries

- [This record explains why React owns the browser view while plain functions own the game rules.](adr-001-react.md) - #Decision #Architecture
- [This record explains the strict TypeScript model and why parsed data still needs runtime validation.](adr-002-typescript.md) - #Decision #Architecture
- [This record explains the single HTML distribution and the distinction between delivery and source organization.](adr-003-single-file.md) - #Decision #Architecture
- [This record explains why the playable game has no backend and what that means for records and sharing.](adr-004-no-backend.md) - #Decision #Architecture
- [This record explains Vite’s role in transforming the source and producing the offline artifact.](adr-005-vite.md) - #Decision #Architecture
- [This record explains why cards and controls use browser elements rather than custom interaction widgets.](adr-006-native-controls.md) - #Decision #Architecture
- [This record explains the generated SVG artwork and why face identity is expressed through geometry.](adr-007-svg-faces.md) - #Decision #Architecture
- [This record explains the supported board sizes and their effect on rules, artwork and layout.](adr-008-seven-sizes.md) - #Decision #Architecture
- [This record explains why a compact versioned code identifies the initial deck separately from progress.](adr-009-board-codes.md) - #Decision #Architecture
- [This record explains the JSON snapshot format, its validation boundary and its relationship to a board code.](adr-010-snapshot-json.md) - #Decision #Architecture
- [This historical record explains the original dotted storage keys and the reasoning behind the preferences key.](adr-011-storage-keys.md) - #Decision #History #Persistence
- [This record explains why Neon Pairs uses visual state and accessible text feedback without game audio.](adr-012-no-sound.md) - #Decision #Sound #Accessibility
- [This record explains measured browser deltas, fractional milliseconds and the separation from logical game time.](adr-013-monotonic-clock.md) - #Decision #Time #Architecture
- [This record explains why hiding the page suspends both elapsed time and a pending mismatch interval.](adr-014-pause-on-hidden.md) - #Decision #Time #Gameplay
- [This record explains why replay is a command-line diagnostic and how it shares the browser’s rules.](adr-015-replay-cli.md) - #Decision #Architecture
- [This record explains why the game uses React state and explicit transitions without a global state library.](adr-016-no-state-library.md) - #Decision #Architecture
- [This record explains the split between neighboring unit tests and application-level browser journeys.](adr-017-colocated-tests.md) - #Decision #Architecture
- [This record explains the browser automation choice and the limits of its accessibility and device evidence.](adr-018-playwright.md) - #Decision #Architecture
- [This historical record explains the retired div-based confirmation overlay and its original interaction model.](adr-019-modal-overlays.md) - #Decision #History #Accessibility
- [This record explains the unit runner and the kinds of behavior it verifies without a browser.](adr-020-vitest.md) - #Decision #Architecture
- [This record explains the seeded shuffle, exact draw mapping and independent generation evidence.](adr-021-seeded-decks.md) - #Decision #Architecture
- [This record explains positional card names, revealed face names and the boundary around hidden identity.](adr-022-card-names.md) - #Decision #Accessibility #Input
- [This historical record explains the retired ordered-list presentation for rankings and results.](adr-023-results-as-lists.md) - #Decision #History #Interface
- [This record explains roving tabindex, edge-stopping navigation and focus memory independent of play.](adr-024-roving-focus.md) - #Decision #Input #Accessibility
- [This record explains the original reduced-motion commitment for card feedback and game completion.](adr-025-reduced-motion.md) - #Decision #Motion #Accessibility
- [This record explains the single dark theme and its relationship to artwork, native controls and review scope.](adr-026-dark-theme.md) - #Decision #Visuals #Interface
- [This record explains offline operation beyond merely caching a previously visited web page.](adr-027-offline-first.md) - #Decision #Architecture
- [This record explains the formatter’s narrow role and how formatting checks differ from behavioral review.](adr-028-prettier.md) - #Decision #Architecture
- [This record explains exact dependency versions, the lockfile and the difference between supported and recorded runtimes.](adr-029-pinned-versions.md) - #Decision #Architecture
- [This record explains the move limit and why reaching it does not stop matching or completion.](adr-030-move-cap.md) - #Decision #Gameplay #Scoring
- [This historical record explains the retired feature-owned live-region and toast announcement design.](adr-031-toast-announcements.md) - #Decision #History #Accessibility
- [This record explains per-size best move records and why elapsed time is not a competing score.](adr-032-best-score-scope.md) - #Decision #Scoring #Persistence
- [This record explains the mismatch observation interval and why it belongs to logical game time.](adr-033-mismatch-800ms.md) - #Decision #Gameplay #Time
- [This record explains how the artwork catalogue covers the largest board without relying on color alone.](adr-034-face-count.md) - #Decision #Visuals #Gameplay
- [This record explains why large boards scroll internally instead of shrinking cards to fit every viewport.](adr-035-scroll-large-boards.md) - #Decision #Layout #Input
- [This historical record explains the retired duration-based exception to reduced-motion handling.](adr-036-motion-opt-in.md) - #Decision #History #Motion
- [This record explains why an unfinished snapshot waits for Resume before accepting play or active time.](adr-037-snapshot-pause.md) - #Decision #Sharing #Time
- [This record explains why the game sends no play telemetry and how engineers investigate problems locally.](adr-038-no-analytics.md) - #Decision #Architecture
- [This record explains the contrast rationale and the limits of the palette and artwork evidence.](adr-039-contrast-floor.md) - #Decision #Visuals #Accessibility
- [This record explains the compact-artifact aim and its architectural tradeoffs.](adr-040-file-size-aim.md) - #Decision #Architecture
- [This historical record explains the retired one-to-thirty-two-character name limit and literal storage choice.](adr-041-name-limits.md) - #Decision #History #Interface
- [This record explains the current reproduction errors and why failed validation leaves the game available.](adr-042-error-copy.md) - #Decision #Interface #Sharing
- [This record explains keyboard parity for revealing cards while keeping navigation separate from play.](adr-043-keyboard-parity.md) - #Decision #Input #Accessibility
- [This record explains why the current game has no router, route state or navigation layer.](adr-044-no-routing.md) - #Decision #Architecture
- [This record explains the English-only scope and the existing separation between labels, formats and game data.](adr-045-no-i18n-yet.md) - #Decision #Writing #Interface
- [This record explains why the game has no dedicated print presentation and what existing export tools provide instead.](adr-046-print-styles.md) - #Decision #Visuals #Scope
- [This record explains completed-click activation and the focus-scrolling order that preserves pointer and touch input.](adr-047-touch-scroll.md) - #Decision #Input #Layout
- [This record explains stable equal-time actions and timeout resolution at an exact replay boundary.](adr-048-replay-order.md) - #Decision #Sharing #Time
- [This record explains the equivalent 200% zoom layout and why scrolling is preferred to shrinking the game.](adr-049-zoom-floor.md) - #Decision #Layout #Accessibility
- [This record explains the persistent completion summary and the distinction between a played win and loaded completion.](adr-050-completion-banner.md) - #Decision #Gameplay #Interface
- [This record explains diagnostic builds, screenshots and runtime records without adding debug controls to the distribution.](adr-051-test-artifacts.md) - #Decision #Testing #Build
- [This record explains the release-tag rationale and separates product, package and data-format versions.](adr-052-release-tags.md) - #Decision #History #Release
- [This record explains repository documentation as a reviewable companion to code, tests and reproducible examples.](adr-053-docs-in-repo.md) - #Decision #Documentation #Architecture
- [This record explains why acceptance combines rule evidence with complete input, reproduction and delivery journeys.](adr-054-acceptance-journeys.md) - #Decision #Testing #Acceptance
- [This record explains the rationale for reviewing behavior and evidence before integration.](adr-055-review-before-merge.md) - #Decision #Review #Quality
- [This record explains why the playable game has no feature-flag system and how test switches remain separate.](adr-056-no-feature-flags.md) - #Decision #Architecture
- [This record explains the component boundaries and the targeted rendering work that keeps large boards responsive.](adr-057-small-components.md) - #Decision #Architecture
- [This record explains the naming rule for new stored data while preserving the existing preferences key.](adr-058-storage-namespace.md) - #Decision #Persistence #Compatibility

