---
open-forge:
  description: Architecture scope for code structure, modules, dependencies,
    randomness, time, tests and the build
  tags:
    - Game
    - Architecture
    - Technology
---
# Architecture and technology

Architecture scope for code structure, modules, dependencies, randomness, time, tests and the build.

## Axioms

- inherited - No local axioms; loaded ancestor axioms remain active.

## Entries

- [Game code structure and module responsibilities](architecture.md) - #Game #Architecture
- [Manifest commands, compiler checks, Vite entries and production versus diagnostic output.](build-pipeline.md) - #Technology #Build #Delivery
- [Clock arithmetic, timeout scheduling, visibility ordering and stale-work cleanup.](clock-design.md) - #Architecture #Time #Browser
- [Behavior-focused review paths and evidence for rules, lifecycle, formats and delivery.](code-review-guide.md) - #Quality #Review #Architecture
- [Stylesheet ownership, global cascade, grid geometry and visual-test seams.](css-organization.md) - #Architecture #CSS #Visuals
- [Locked packages, runtime versus tooling roles and dependency evidence.](dependency-policy.md) - #Architecture #Dependencies #Build
- [Behavior ownership, dependency direction and feature placement in the game source.](module-layout-policy.md) - #Architecture #Modules #Code
- [Single-file distribution, disk and HTTP behavior and self-containment evidence.](offline-delivery.md) - #Technology #Offline #Delivery
- [Explicit inputs, immutable transitions, validation and effect separation in the core.](purity-guide.md) - #Architecture #Rules #Purity
- [Fresh seed selection, rejection sampling and the boundary with reproducible decks.](randomness-policy.md) - #Architecture #Randomness #Reproducibility
- [React components, hooks, local state and the data-only rule boundary.](react-boundaries.md) - #Architecture #React #Rendering
- [Session fields, controller actions, replacement generations and preference effects.](session-module.md) - #Architecture #Session #State
- [Source inspection patterns, discovery, package checks and regex coverage limits.](source-audit-notes.md) - #Quality #Audits #Source
- [A file-by-file map of application code, tooling, diagnostics and test support.](source-layout.md) - #Architecture #Source #Navigation
- [Language, package versions, build and distribution](technology.md) - #Game #Technology
- [Unit, source and browser verification layers and what their results establish.](test-policy.md) - #Quality #Testing #Architecture
- [Active-time ownership, pause conditions, synchronization and logical interval handling.](time-policy.md) - #Architecture #Time #Session
- [Compiler projects, exact options, strictness and environment coverage.](typescript-settings.md) - #Technology #TypeScript #Tooling

