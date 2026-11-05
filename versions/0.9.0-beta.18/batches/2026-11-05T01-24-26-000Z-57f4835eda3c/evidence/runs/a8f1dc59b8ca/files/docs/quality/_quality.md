---
open-forge:
  description: Quality scope for acceptance, testing, performance and releases
  tags:
    - Game
    - Testing
    - Acceptance
---
# Quality

Quality scope for acceptance, testing, performance and releases.

## Axioms

- inherited - No local axioms; loaded ancestor axioms remain active.

## Entries

- [Public game acceptance examples](acceptance.md) - #Game #Acceptance
- [Accessibility findings, automated evidence and the remaining spoken and device acceptance boundaries.](accessibility-audit.md) - #Quality #Accessibility #Audit
- [Recorded runtime compatibility and the browser, viewport, origin and input conditions covered by tests.](browser-support.md) - #Quality #Compatibility #Browser
- [How the Node and Playwright harness builds, drives and observes the game distribution.](browser-test-guide.md) - #Quality #Browser #Testing
- [Literal deal data, independent oracles, reviewed JSON expectations, browser helpers and generated artifacts.](fixtures-guide.md) - #Quality #Fixtures #Testing
- [How controlled clocks, visibility inputs, scroll settling and local tolerances isolate timing failures.](flaky-test-notes.md) - #Quality #Timing #Testing
- [Observed missing verification inputs and documented limits on compatibility and acceptance evidence.](known-issues.md) - #Quality #Issues #Evidence
- [Existing performance constraints, render and input work, and the absence of measured latency thresholds.](performance-budget.md) - #Quality #Performance #Rendering
- [Recognizable failure modes and the current tests protecting clock, focus, formats and delivery.](regression-catalogue.md) - #Quality #Regressions #Testing
- [Existing release commands, candidate checks, delivery evidence and acceptance handoff.](release-checklist.md) - #Quality #Release #Verification
- [How pure tests, browser journeys, source checks and acceptance contribute different evidence.](test-strategy.md) - #Quality #Testing #Architecture
- [How direct state, parser, session, storage and CLI tests isolate decisions and boundaries.](unit-test-guide.md) - #Quality #UnitTests #Game

