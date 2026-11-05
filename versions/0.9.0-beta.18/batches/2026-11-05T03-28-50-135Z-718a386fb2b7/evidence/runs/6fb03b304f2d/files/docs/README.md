# Neon Pairs

Neon Pairs is a browser memory game that asks you to find every pair of matching cards.

Status: spec version 2.2.

Reveal two cards at a time and finish in as few moves as you can. A board code repeats a deal, so you can report a problem with the same starting cards.

## Play

Choose a size, then reveal a card and find its partner. Matches stay face up. A miss closes both cards after 800 active milliseconds. Finding every pair completes the game with your moves and time. New Game gives you another deal. Restart repeats the current deal. Full details are in [Rules](gameplay/rules.md).

## Controls

Use mouse, touch or keyboard for the same card action. Keyboard movement, focus, card names and the screen reader journey are in [Input](interface/input.md). The labels and behavior of game and reproduction actions are in [Controls](interface/controls.md).

## Appearance

The game draws faces on a dark background. Shape, marker and fill distinguish each face without color. Layout, colors, motion, 16x16 behavior and zoom are in [Visuals](visuals/visuals.md). The game stays silent as defined in [Sound](sound/sound.md).

## Repeat a game

A board code describes a deal. A snapshot saves progress. A replay records timed actions. The algorithms and version 1 formats are in [Reproducibility](sharing/reproducibility.md). Spec version 2.2 doesn't change those format versions.

## Build

Use React, TypeScript and native DOM controls. Package pins, commands and the offline HTML distribution are in [Technology](architecture/technology.md). Pure game functions, browser effects and behavior placement are in [Architecture](architecture/architecture.md).

Use the journeys in [Acceptance](quality/acceptance.md) to check the finished game. Those examples add no rules beyond the requirement IDs in their defining documents.

## Out of scope

The game doesn't need to support these, so they're never tested:

- Keys and modifier combinations beyond the ones in [Input](interface/input.md#keyboard-movement), which stay with the browser
- Holding a key down
- Several tabs or windows of the game open at once, where each tab may simply overwrite the saved preferences
- How a pointer press behaves when it drifts or is dragged off a card
- Replay or snapshot files with encodings beyond the stated rules, such as a byte-order mark
- Spoken screen-reader output, which stays part of user acceptance as [Input](interface/input.md#screen-reader) describes
- Confirming that a touch long press on a real device opens the context menu without revealing a card, which stays part of user acceptance like spoken output because automated browsers can't produce that gesture

## Documentation map

Every project document, by area. Project-wide policies apply to all new work, including work that doesn't mention them.

### Gameplay

- [rules.md](gameplay/rules.md): Card matching, moves, timing and victory rules
- [deck-generation.md](gameplay/deck-generation.md): Board-code parsing, paired deck construction, deterministic shuffle arithmetic, and fresh seed selection.
- [selection-state.md](gameplay/selection-state.md): The closed, one-card, and mismatch selection alternatives, visibility, and decoding boundaries.
- [turn-resolution.md](gameplay/turn-resolution.md): Activation guards, second-reveal resolution, and the ordering of time, feedback, and turns.
- [scoring-and-moves.md](gameplay/scoring-and-moves.md): Pair progress, move accounting, minimum completions, and continued play at the move cap.
- [best-score-records.md](gameplay/best-score-records.md): Per-size best move comparison, preference validation, persistence, and imported-completion behavior.
- [board-size-catalogue.md](gameplay/board-size-catalogue.md): The seven board sizes, exact card and pair counts, included faces, and size selection behavior.
- [win-conditions.md](gameplay/win-conditions.md): Full matched coverage, the final transition, stopped time, and played versus imported completion.
- [game-state-model.md](gameplay/game-state-model.md): GameState fields, invariants, derived values, immutable transitions, and session boundaries.
- [pair-identity.md](gameplay/pair-identity.md): Position indices versus face numbers, artwork identity dimensions, and hidden-face rendering.
- [mismatch-interval.md](gameplay/mismatch-interval.md): The exact 800-millisecond active interval, synchronization, pauses, and stale timer protection.
- [elapsed-time-rules.md](gameplay/elapsed-time-rules.md): Active-time accumulation, browser observations, display conversion, caps, and snapshot precision.
- [new-game-and-restart.md](gameplay/new-game-and-restart.md): What fresh deals, repeats, size changes, loads, Resume, exports, and reloads preserve or reset.
- [gameplay-faq.md](gameplay/gameplay-faq.md): Answers to common play and maintenance questions, with links to detailed behavior pages.

### Controls and input

- [controls.md](interface/controls.md): Game options and reproduction controls
- [input.md](interface/input.md): Pointer, touch, keyboard and focus behavior
- [control-bar.md](interface/control-bar.md): The deal buttons, size selector, responsive arrangement and session callbacks in Controls.tsx.
- [reproduction-panel.md](interface/reproduction-panel.md): Board-code drafts, snapshot editing, load outcomes, export and Resume behavior.
- [status-bar.md](interface/status-bar.md): The statistics definition list, counter sources, elapsed display and completion output.
- [board-keyboard-navigation.md](interface/board-keyboard-navigation.md): Arrow target calculations, remembered board entry, DOM focus and nearest scrolling.
- [pointer-and-touch.md](interface/pointer-and-touch.md): Native click and tap activation, press timing and scrolling through large boards.
- [focus-policy.md](interface/focus-policy.md): Current action focus and board memory, plus the policy for main-screen replacements.
- [dialog-policy.md](interface/dialog-policy.md): The leave-work confirmation policy and its boundary with current direct deal actions.
- [target-size-policy.md](interface/target-size-policy.md): The new-control size policy, existing CSS dimensions and rendered target measurement.
- [text-entry-policy.md](interface/text-entry-policy.md): Accepted name representation and its separation from board-code and JSON input.
- [name-length-policy.md](interface/name-length-policy.md): Name-length acceptance, Unicode counting units and boundary examples.
- [duplicate-names-policy.md](interface/duplicate-names-policy.md): Group-scoped name comparison, case handling and evidence for repeat detection.
- [announcements-policy.md](interface/announcements-policy.md): Status publication, repeated event identity, turn results and load feedback.
- [tables-policy.md](interface/tables-policy.md): The result-table markup policy and how it differs from current statistics and cards.
- [screen-reader-notes.md](interface/screen-reader-notes.md): A complete game through exposed names and states, with accessibility evidence limits.
- [form-layout-guide.md](interface/form-layout-guide.md): Label associations, responsive field rows, text editing surfaces and load-notice layout.
- [error-display-guide.md](interface/error-display-guide.md): Load validation, visible notices, preserved drafts, focus and retry behavior.
- [native-controls-guide.md](interface/native-controls-guide.md): Native element choices and the browser behavior retained around React callbacks.
- [disabled-state-guide.md](interface/disabled-state-guide.md): Matched ARIA state, game eligibility, imported pause and continued focus movement.
- [interface-review-checklist.md](interface/interface-review-checklist.md): Populated interface review journeys and the source or browser evidence for each.

### Visuals

- [visuals.md](visuals/visuals.md): Layout, card artwork, colors and motion
- [motion-policy.md](visuals/motion-policy.md): Current card and completion effects, reduced motion, session flags and motion test coverage.
- [color-policy.md](visuals/color-policy.md): Interface and artwork color roles, redundant state cues, palette indexing and color checks.
- [card-artwork.md](visuals/card-artwork.md): Card props, hidden-face rendering, button naming, back decoration, face SVG and matched overlays.
- [face-catalogue.md](visuals/face-catalogue.md): All face identity ranges, shape paths, marker coordinates, fill modes and face-sheet evidence.
- [layout-grid.md](visuals/layout-grid.md): Page and board sizing, width calculations, scrollbars, responsive wrapping and layout tests.
- [zoom-behaviour.md](visuals/zoom-behaviour.md): Equivalent zoom geometry, text reflow, native controls and playable scrolling boards.
- [theme-tokens.md](visuals/theme-tokens.md): Existing CSS variables, literal values, artwork color tables and their cascade relationships.
- [spacing-scale.md](visuals/spacing-scale.md): Authored spacing values by component, resets, scroll clearance and the computed spacing audit.
- [typography.md](visuals/typography.md): System font inheritance, text hierarchy, numeric styling, controls and text readability evidence.
- [large-board-rendering.md](visuals/large-board-rendering.md): Full 256-card rendering, bounded scrolling, focus clearance, touch input and rendering optimizations.
- [icon-and-glyph-policy.md](visuals/icon-and-glyph-policy.md): Why the current artwork uses SVG paths and CSS decoration, with native control affordances.
- [contrast-audit.md](visuals/contrast-audit.md): Reproducible sRGB contrast calculations for surfaces, text, artwork and the pulse midpoint.
- [visual-review-checklist.md](visuals/visual-review-checklist.md): Existing visual requirements and relevant source tests grouped into a concrete review journey.

### Sound

- [sound.md](sound/sound.md): Game sound behavior
- [feedback-without-audio.md](sound/feedback-without-audio.md): Traces silent card, turn, status, completion and load feedback through the current components and checks.
- [audio-research-notes.md](sound/audio-research-notes.md): Records the discarded audio exploration and relates its tradeoffs to the current silent design and evidence.

### Sharing and formats

- [reproducibility.md](sharing/reproducibility.md): Board codes, snapshots and replay formats
- [data-exchange-policy.md](sharing/data-exchange-policy.md): How board codes, snapshots and replays cross application boundaries, with policy for future exports.
- [import-safety-policy.md](sharing/import-safety-policy.md): Untrusted-input validation, replacement safety, current diagnostics and the field-error policy.
- [board-code-format.md](sharing/board-code-format.md): Version 1 code syntax, exact deal generation, bounded draws and independent vectors.
- [snapshot-format.md](sharing/snapshot-format.md): Snapshot fields, shared JSON helpers, consistency checks, rounding and import lifecycle.
- [replay-format.md](sharing/replay-format.md): Replay schema, logical timing, validation results and CLI conversion to a final snapshot.
- [snapshot-selection-notes.md](sharing/snapshot-selection-notes.md): How matched positions and selection variants are validated against a regenerated deck.
- [format-versioning-guide.md](sharing/format-versioning-guide.md): Format and product versions, exact-key compatibility and changes to artifact meaning.
- [sharing-faq.md](sharing/sharing-faq.md): Practical answers for copying deals, loading progress, fixing drafts and reporting sharing bugs.

### Persistence

- [persistence-overview.md](persistence/persistence-overview.md): What the current game saves, what remains in memory and which persistence page to consult.
- [persistence-envelope.md](persistence/persistence-envelope.md): The feature JSON envelope and its distinction from the existing versioned preference aggregate.
- [retention-policy.md](persistence/retention-policy.md): Saved-list retention, aggregate best-score lifetime and the absence of an attempt history.
- [storage-failure-policy.md](persistence/storage-failure-policy.md): Unavailable-storage behavior, feature feedback and the current adapter’s catch boundaries.
- [corrupt-data-policy.md](persistence/corrupt-data-policy.md): Preference validation, silent rejection and the timing of read rejection and later replacement.
- [preferences-store.md](persistence/preferences-store.md): Code-level guide to preference data, best selection, browser-store acquisition and the save effect.
- [storage-quota-notes.md](persistence/storage-quota-notes.md): Measured preference payload sizes, browser capacity guidance and the scope of quota evidence.
- [private-browsing-notes.md](persistence/private-browsing-notes.md): Private-session storage lifetime, denied operations and comparisons that distinguish their effects.
- [storage-testing-guide.md](persistence/storage-testing-guide.md): Existing persistence tests and practical checks for decoding, failures, completion and reload.

### Competition

- [tournament-mode.md](competition/tournament-mode.md): Tournament play, saved history and exchange format.
- [competition-overview.md](competition/competition-overview.md): Purpose and original design context of shared-device competition.
- [competition-pairing.md](competition/competition-pairing.md): Entry-order seeds and opening pairings for four- and eight-person brackets, with named examples.
- [competition-rounds.md](competition/competition-rounds.md): Round names and their displayed text, with distinctions between event stages and browser session generations.
- [competition-boards.md](competition/competition-boards.md): Board dimensions by stage, their face sets, and implications for layout and navigation.
- [competition-deals.md](competition/competition-deals.md): Match deal identity, board-code reproducibility, and the limits of the current fresh-deal helper.
- [competition-ties.md](competition/competition-ties.md): Ordered result comparison, active-time precision, and seed priority for equal results.
- [competition-scores.md](competition/competition-scores.md): Competition isolation from ordinary saved size and best moves, including the current session write paths.
- [competition-research.md](competition/competition-research.md): Playtests about face recognition, keyboard travel, device handoff and spectating.

### Architecture and technology

- [architecture.md](architecture/architecture.md): Game code structure and module responsibilities
- [technology.md](architecture/technology.md): Language, package versions, build and distribution
- [module-layout-policy.md](architecture/module-layout-policy.md): Behavior ownership, dependency direction and feature placement in the game source.
- [dependency-policy.md](architecture/dependency-policy.md): Locked packages, runtime versus tooling roles and dependency evidence.
- [randomness-policy.md](architecture/randomness-policy.md): Fresh seed selection, rejection sampling and the boundary with reproducible decks.
- [time-policy.md](architecture/time-policy.md): Active-time ownership, pause conditions, synchronization and logical interval handling.
- [test-policy.md](architecture/test-policy.md): Unit, source and browser verification layers and what their results establish.
- [source-layout.md](architecture/source-layout.md): A file-by-file map of application code, tooling, diagnostics and test support.
- [session-module.md](architecture/session-module.md): Session fields, controller actions, replacement generations and preference effects.
- [react-boundaries.md](architecture/react-boundaries.md): React components, hooks, local state and the data-only rule boundary.
- [build-pipeline.md](architecture/build-pipeline.md): Manifest commands, compiler checks, Vite entries and production versus diagnostic output.
- [offline-delivery.md](architecture/offline-delivery.md): Single-file distribution, disk and HTTP behavior and self-containment evidence.
- [clock-design.md](architecture/clock-design.md): Clock arithmetic, timeout scheduling, visibility ordering and stale-work cleanup.
- [purity-guide.md](architecture/purity-guide.md): Explicit inputs, immutable transitions, validation and effect separation in the core.
- [typescript-settings.md](architecture/typescript-settings.md): Compiler projects, exact options, strictness and environment coverage.
- [css-organization.md](architecture/css-organization.md): Stylesheet ownership, global cascade, grid geometry and visual-test seams.
- [source-audit-notes.md](architecture/source-audit-notes.md): Source inspection patterns, discovery, package checks and regex coverage limits.
- [code-review-guide.md](architecture/code-review-guide.md): Behavior-focused review paths and evidence for rules, lifecycle, formats and delivery.

### Decisions

- [adr-001-react.md](decisions/adr-001-react.md): This record explains why React owns the browser view while plain functions own the game rules.
- [adr-002-typescript.md](decisions/adr-002-typescript.md): This record explains the strict TypeScript model and why parsed data still needs runtime validation.
- [adr-003-single-file.md](decisions/adr-003-single-file.md): This record explains the single HTML distribution and the distinction between delivery and source organization.
- [adr-004-no-backend.md](decisions/adr-004-no-backend.md): This record explains why the playable game has no backend and what that means for records and sharing.
- [adr-005-vite.md](decisions/adr-005-vite.md): This record explains Vite’s role in transforming the source and producing the offline artifact.
- [adr-006-native-controls.md](decisions/adr-006-native-controls.md): This record explains why cards and controls use browser elements rather than custom interaction widgets.
- [adr-007-svg-faces.md](decisions/adr-007-svg-faces.md): This record explains the generated SVG artwork and why face identity is expressed through geometry.
- [adr-008-seven-sizes.md](decisions/adr-008-seven-sizes.md): This record explains the supported board sizes and their effect on rules, artwork and layout.
- [adr-009-board-codes.md](decisions/adr-009-board-codes.md): This record explains why a compact versioned code identifies the initial deck separately from progress.
- [adr-010-snapshot-json.md](decisions/adr-010-snapshot-json.md): This record explains the JSON snapshot format, its validation boundary and its relationship to a board code.
- [adr-011-storage-keys.md](decisions/adr-011-storage-keys.md): This historical record explains the original dotted storage keys and the reasoning behind the preferences key.
- [adr-012-no-sound.md](decisions/adr-012-no-sound.md): This record explains why Neon Pairs uses visual state and accessible text feedback without game audio.
- [adr-013-monotonic-clock.md](decisions/adr-013-monotonic-clock.md): This record explains measured browser deltas, fractional milliseconds and the separation from logical game time.
- [adr-014-pause-on-hidden.md](decisions/adr-014-pause-on-hidden.md): This record explains why hiding the page suspends both elapsed time and a pending mismatch interval.
- [adr-015-replay-cli.md](decisions/adr-015-replay-cli.md): This record explains why replay is a command-line diagnostic and how it shares the browser’s rules.
- [adr-016-no-state-library.md](decisions/adr-016-no-state-library.md): This record explains why the game uses React state and explicit transitions without a global state library.
- [adr-017-colocated-tests.md](decisions/adr-017-colocated-tests.md): This record explains the split between neighboring unit tests and application-level browser journeys.
- [adr-018-playwright.md](decisions/adr-018-playwright.md): This record explains the browser automation choice and the limits of its accessibility and device evidence.
- [adr-019-modal-overlays.md](decisions/adr-019-modal-overlays.md): This historical record explains the retired div-based confirmation overlay and its original interaction model.
- [adr-020-vitest.md](decisions/adr-020-vitest.md): This record explains the unit runner and the kinds of behavior it verifies without a browser.
- [adr-021-seeded-decks.md](decisions/adr-021-seeded-decks.md): This record explains the seeded shuffle, exact draw mapping and independent generation evidence.
- [adr-022-card-names.md](decisions/adr-022-card-names.md): This record explains positional card names, revealed face names and the boundary around hidden identity.
- [adr-023-results-as-lists.md](decisions/adr-023-results-as-lists.md): This historical record explains the retired ordered-list presentation for rankings and results.
- [adr-024-roving-focus.md](decisions/adr-024-roving-focus.md): This record explains roving tabindex, edge-stopping navigation and focus memory independent of play.
- [adr-025-reduced-motion.md](decisions/adr-025-reduced-motion.md): This record explains the original reduced-motion commitment for card feedback and game completion.
- [adr-026-dark-theme.md](decisions/adr-026-dark-theme.md): This record explains the single dark theme and its relationship to artwork, native controls and review scope.
- [adr-027-offline-first.md](decisions/adr-027-offline-first.md): This record explains offline operation beyond merely caching a previously visited web page.
- [adr-028-prettier.md](decisions/adr-028-prettier.md): This record explains the formatter’s narrow role and how formatting checks differ from behavioral review.
- [adr-029-pinned-versions.md](decisions/adr-029-pinned-versions.md): This record explains exact dependency versions, the lockfile and the difference between supported and recorded runtimes.
- [adr-030-move-cap.md](decisions/adr-030-move-cap.md): This record explains the move limit and why reaching it does not stop matching or completion.
- [adr-031-toast-announcements.md](decisions/adr-031-toast-announcements.md): This historical record explains the retired feature-owned live-region and toast announcement design.
- [adr-032-best-score-scope.md](decisions/adr-032-best-score-scope.md): This record explains per-size best move records and why elapsed time is not a competing score.
- [adr-033-mismatch-800ms.md](decisions/adr-033-mismatch-800ms.md): This record explains the mismatch observation interval and why it belongs to logical game time.
- [adr-034-face-count.md](decisions/adr-034-face-count.md): This record explains how the artwork catalogue covers the largest board without relying on color alone.
- [adr-035-scroll-large-boards.md](decisions/adr-035-scroll-large-boards.md): This record explains why large boards scroll internally instead of shrinking cards to fit every viewport.
- [adr-036-motion-opt-in.md](decisions/adr-036-motion-opt-in.md): This historical record explains the retired duration-based exception to reduced-motion handling.
- [adr-037-snapshot-pause.md](decisions/adr-037-snapshot-pause.md): This record explains why an unfinished snapshot waits for Resume before accepting play or active time.
- [adr-038-no-analytics.md](decisions/adr-038-no-analytics.md): This record explains why the game sends no play telemetry and how engineers investigate problems locally.
- [adr-039-contrast-floor.md](decisions/adr-039-contrast-floor.md): This record explains the contrast rationale and the limits of the palette and artwork evidence.
- [adr-040-file-size-aim.md](decisions/adr-040-file-size-aim.md): This record explains the compact-artifact aim and its architectural tradeoffs.
- [adr-041-name-limits.md](decisions/adr-041-name-limits.md): This historical record explains the retired one-to-thirty-two-character name limit and literal storage choice.
- [adr-042-error-copy.md](decisions/adr-042-error-copy.md): This record explains the current reproduction errors and why failed validation leaves the game available.
- [adr-043-keyboard-parity.md](decisions/adr-043-keyboard-parity.md): This record explains keyboard parity for revealing cards while keeping navigation separate from play.
- [adr-044-no-routing.md](decisions/adr-044-no-routing.md): This record explains why the current game has no router, route state or navigation layer.
- [adr-045-no-i18n-yet.md](decisions/adr-045-no-i18n-yet.md): This record explains the English-only scope and the existing separation between labels, formats and game data.
- [adr-046-print-styles.md](decisions/adr-046-print-styles.md): This record explains why the game has no dedicated print presentation and what existing export tools provide instead.
- [adr-047-touch-scroll.md](decisions/adr-047-touch-scroll.md): This record explains completed-click activation and the focus-scrolling order that preserves pointer and touch input.
- [adr-048-replay-order.md](decisions/adr-048-replay-order.md): This record explains stable equal-time actions and timeout resolution at an exact replay boundary.
- [adr-049-zoom-floor.md](decisions/adr-049-zoom-floor.md): This record explains the equivalent 200% zoom layout and why scrolling is preferred to shrinking the game.
- [adr-050-completion-banner.md](decisions/adr-050-completion-banner.md): This record explains the persistent completion summary and the distinction between a played win and loaded completion.
- [adr-051-test-artifacts.md](decisions/adr-051-test-artifacts.md): This record explains diagnostic builds, screenshots and runtime records without adding debug controls to the distribution.
- [adr-052-release-tags.md](decisions/adr-052-release-tags.md): This record explains the release-tag rationale and separates product, package and data-format versions.
- [adr-053-docs-in-repo.md](decisions/adr-053-docs-in-repo.md): This record explains repository documentation as a reviewable companion to code, tests and reproducible examples.
- [adr-054-acceptance-journeys.md](decisions/adr-054-acceptance-journeys.md): This record explains why acceptance combines rule evidence with complete input, reproduction and delivery journeys.
- [adr-055-review-before-merge.md](decisions/adr-055-review-before-merge.md): This record explains the rationale for reviewing behavior and evidence before integration.
- [adr-056-no-feature-flags.md](decisions/adr-056-no-feature-flags.md): This record explains why the playable game has no feature-flag system and how test switches remain separate.
- [adr-057-small-components.md](decisions/adr-057-small-components.md): This record explains the component boundaries and the targeted rendering work that keeps large boards responsive.
- [adr-058-storage-namespace.md](decisions/adr-058-storage-namespace.md): This record explains the naming rule for new stored data while preserving the existing preferences key.

### Writing

- [voice-guide.md](writing/voice-guide.md): Explains the game's restrained voice through current labels, help, accessible names and result feedback.
- [numbers-style.md](writing/numbers-style.md): Distinguishes displayed counts and durations from indices, numeric limits and serialized values.
- [glossary.md](writing/glossary.md): Defines player and engineering terms for cards, turns, session state, time and reproduction tools.
- [error-message-style.md](writing/error-message-style.md): Documents exact browser notices, replay diagnostics, recovery context and internal exception boundaries.
- [documentation-style.md](writing/documentation-style.md): Explains source-grounded documentation, scoped examples, ownership links and bounded evidence claims.
- [changelog-style.md](writing/changelog-style.md): Shows how release notes connect changed behavior with compatibility, source details and verification evidence.

### Quality

- [acceptance.md](quality/acceptance.md): Public game acceptance examples
- [test-strategy.md](quality/test-strategy.md): How pure tests, browser journeys, source checks and acceptance contribute different evidence.
- [browser-test-guide.md](quality/browser-test-guide.md): How the Node and Playwright harness builds, drives and observes the game distribution.
- [unit-test-guide.md](quality/unit-test-guide.md): How direct state, parser, session, storage and CLI tests isolate decisions and boundaries.
- [regression-catalogue.md](quality/regression-catalogue.md): Recognizable failure modes and the current tests protecting clock, focus, formats and delivery.
- [performance-budget.md](quality/performance-budget.md): Existing performance constraints, render and input work, and the absence of measured latency thresholds.
- [accessibility-audit.md](quality/accessibility-audit.md): Accessibility findings, automated evidence and the remaining spoken and device acceptance boundaries.
- [release-checklist.md](quality/release-checklist.md): Existing release commands, candidate checks, delivery evidence and acceptance handoff.
- [known-issues.md](quality/known-issues.md): Observed missing verification inputs and documented limits on compatibility and acceptance evidence.
- [browser-support.md](quality/browser-support.md): Recorded runtime compatibility and the browser, viewport, origin and input conditions covered by tests.
- [fixtures-guide.md](quality/fixtures-guide.md): Literal deal data, independent oracles, reviewed JSON expectations, browser helpers and generated artifacts.
- [flaky-test-notes.md](quality/flaky-test-notes.md): How controlled clocks, visibility inputs, scroll settling and local tolerances isolate timing failures.

### History

- [release-notes-1-0.md](history/release-notes-1-0.md): First-release history covering turns, move counting, visible progress, and local records.
- [release-notes-1-1.md](history/release-notes-1-1.md): Keyboard release history covering spatial movement, card names, focus, and native page traversal.
- [release-notes-1-2.md](history/release-notes-1-2.md): Large-board release history covering seven sizes, scroll containment, artwork variety, and focus reachability.
- [release-notes-1-3.md](history/release-notes-1-3.md): Board-code release history explaining deterministic generation, repeatable deals, and load behavior.
- [release-notes-1-4.md](history/release-notes-1-4.md): Snapshot release history covering explicit progress transport, validation, paused restoration, and completed imports.
- [release-notes-2-0.md](history/release-notes-2-0.md): Specification consolidation history connecting pure transitions, browser effects, data lifetimes, and acceptance journeys.
- [release-notes-2-1.md](history/release-notes-2-1.md): Motion review history explaining reduced-motion CSS, completion effects, and unchanged game timing.
- [release-notes-2-2.md](history/release-notes-2-2.md): Current spec 2.2 behavior and recorded evidence for timing, navigation, zoom, builds, and accessibility.
- [incident-lost-best-scores.md](history/incident-lost-best-scores.md): Score-loss investigation distinguishing deal replacement, record updates, and storage fallback.
- [incident-focus-trap.md](history/incident-focus-trap.md): Focus investigation covering native Tab exit, Resume handoff, and visible remembered positions.
- [incident-clock-drift.md](history/incident-clock-drift.md): Timing investigation covering observed deltas, visibility pauses, fractional time, and stale callbacks.
- [incident-16x16-layout.md](history/incident-16x16-layout.md): Layout investigation covering intrinsic width, scrollbars, pointer timing, and clipped focus outlines.
- [incident-snapshot-rejects.md](history/incident-snapshot-rejects.md): Parser investigation separating valid state from canonical JSON presentation and transport limits.
- [research-playtest-spring.md](history/research-playtest-spring.md): Introductory playtest observations about learning turns, reading counters, and recognizing completion.
- [research-playtest-autumn.md](history/research-playtest-autumn.md): Follow-up observations about large boards, repeated deals, corrected drafts, and restored progress.
- [research-screen-reader-sessions.md](history/research-screen-reader-sessions.md): Access research paired with the actual limits of automated accessibility-tree evidence.
- [research-phone-usage.md](history/research-phone-usage.md): Phone observations about touch travel, board containment, interruptions, and evidence limits.
- [research-memory-games-survey.md](history/research-memory-games-survey.md): Pattern survey comparing miss timing, solved positions, scoring, face identity, and local repeatability.
- [retired-idea-hints.md](history/retired-idea-hints.md): Unbuilt hint proposals and their unresolved effects on information history, scores, snapshots, and access.
- [retired-idea-themes.md](history/retired-idea-themes.md): Unbuilt theme proposals distinguishing surface colors, face replacement, naming, and offline asset delivery.
- [retired-idea-timed-mode.md](history/retired-idea-timed-mode.md): Unbuilt countdown proposals and unresolved questions about deadlines, active time, board difficulty, and records.
- [retired-idea-online-play.md](history/retired-idea-online-play.md): Unbuilt connected-play proposals and the service, ordering, trust, and synchronization questions they raised.
- [roadmap-notes.md](history/roadmap-notes.md): Noncommittal planning discussions about evidence, explanations, dense boards, reproduction, and maintenance.
- [meeting-notes-architecture.md](history/meeting-notes-architecture.md): Architecture review tracing attempt ownership, session effects, rendering work, validation, and delivery.
- [meeting-notes-accessibility.md](history/meeting-notes-accessibility.md): Access review connecting keyboard journeys, hidden information, result events, visual reach, and evidence.

Back to [Play](#play).
