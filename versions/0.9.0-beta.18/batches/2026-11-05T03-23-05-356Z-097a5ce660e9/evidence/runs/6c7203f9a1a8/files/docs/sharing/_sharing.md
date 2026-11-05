---
open-forge:
  description: Sharing scope for board codes, snapshots, replays and Tournament JSON
  tags:
    - Game
    - Reproducibility
    - Formats
---

# Sharing and formats

Sharing scope for board codes, snapshots, replays and Tournament JSON.

## Axioms

- inherited - No local axioms; loaded ancestor axioms remain active.

## Entries

- [Version 1 code syntax, exact deal generation, bounded draws and independent vectors.](board-code-format.md) - #Sharing #Generation #Formats
- [How board codes, snapshots, replays and Tournament JSON cross application boundaries.](data-exchange-policy.md) - #Sharing #Formats #Policy
- [Format and product versions, exact-key compatibility and changes to artifact meaning.](format-versioning-guide.md) - #Formats #Compatibility #Engineering
- [Untrusted-input validation, replacement safety, current diagnostics and the field-error policy.](import-safety-policy.md) - #Sharing #Validation #Policy
- [Replay schema, logical timing, validation results and CLI conversion to a final snapshot.](replay-format.md) - #Sharing #Replay #CLI
- [Board codes, snapshots and replay formats](reproducibility.md) - #Game #Reproducibility
- [Practical answers for copying deals, loading progress, fixing drafts and reporting sharing bugs.](sharing-faq.md) - #Sharing #Help #Reproduction
- [Snapshot fields, shared JSON helpers, consistency checks, rounding and import lifecycle.](snapshot-format.md) - #Sharing #Snapshots #Formats
- [How matched positions and selection variants are validated against a regenerated deck.](snapshot-selection-notes.md) - #Snapshots #Validation #Implementation
