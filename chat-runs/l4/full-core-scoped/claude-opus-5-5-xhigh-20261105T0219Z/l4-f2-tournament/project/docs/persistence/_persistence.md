---
open-forge:
  description: Persistence scope for what is stored in the browser and how it fails
  tags:
    - Game
    - Storage
---
# Persistence

Persistence scope for what is stored in the browser and how it fails.

## Axioms

- inherited - No local axioms; loaded ancestor axioms remain active.

## Entries

- [Preference validation, silent rejection and the timing of read rejection and later replacement.](corrupt-data-policy.md) - #Persistence #Validation
- [The feature JSON envelope and its distinction from the existing versioned preference aggregate.](persistence-envelope.md) - #Persistence #Formats
- [What the current game saves, what remains in memory and which persistence page to consult.](persistence-overview.md) - #Persistence #Architecture
- [Code-level guide to preference data, best selection, browser-store acquisition and the save effect.](preferences-store.md) - #Persistence #React #Code
- [Private-session storage lifetime, denied operations and comparisons that distinguish their effects.](private-browsing-notes.md) - #Persistence #Browsers #Privacy
- [Saved-list retention, aggregate best-score lifetime and the absence of an attempt history.](retention-policy.md) - #Persistence #Retention
- [Unavailable-storage behavior, feature feedback and the current adapter’s catch boundaries.](storage-failure-policy.md) - #Persistence #Failures
- [Measured preference payload sizes, browser capacity guidance and the scope of quota evidence.](storage-quota-notes.md) - #Persistence #Browsers #Capacity
- [Existing persistence tests and practical checks for decoding, failures, completion and reload.](storage-testing-guide.md) - #Persistence #Testing

