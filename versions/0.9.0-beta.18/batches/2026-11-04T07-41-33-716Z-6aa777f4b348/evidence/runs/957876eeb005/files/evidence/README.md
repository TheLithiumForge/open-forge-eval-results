# Acceptance evidence

Generated from the built game with Playwright 1.64.1 and Chromium 156.0.8078.4 on 4 November 2026. See the root [README](../README.md) for exact commands and the tested Node/npm versions.

| File | Evidence |
| --- | --- |
| [accessibility-tree.json](accessibility-tree.json) | Accessibility snapshots through hidden deal, revealed face, match, win, and another game; browser/tool versions and no screen-reader use recorded |
| [live-announcements.json](live-announcements.json) | Exactly one event for each of two identical misses, a match, and two identical invalid loads; focus/clock/mismatch closing add none |
| [faces-44px-grayscale.png](faces-44px-grayscale.png) | All 128 real SVG faces in 44px bordered cards; solid faces left, outline faces right, rows by marker and columns by shape |
| [layout-phone.png](layout-phone.png) | 360×800 large board with controls reachable |
| [layout-desktop.png](layout-desktop.png) | 1280×800 large board |
| [layout-zoom-200.png](layout-zoom-200.png) | 640×400 at device scale 2, the specified zoom-equivalent layout |
| [replay-example.json](replay-example.json) | The specification's version 1 replay example |
| [replay-final-snapshot.json](replay-final-snapshot.json) | Exact stdout from the documented npm replay command |
| [replay-cli-checks.json](replay-cli-checks.json) | Success, invalid-input and missing-file exit/output checks |
| [validation.json](validation.json) | Command results, exact tool versions, artifact bytes/hash, and TypeScript line-count audit |

The 37 browser journeys also check actual touch swipes and completed taps, all seven board sizes through completion, caps, timer replacement, imported pauses, storage failures, single-pulse completion and reduced motion, and offline `file:` play. Visibility is simulated with controlled-clock events; storage checks run at a local HTTP origin in fresh contexts.

The grayscale sheet was visually reviewed at its actual card size: all shape/marker/fill combinations remain distinguishable, including diagonal-marker solid and outline squares. Automated uniqueness checks also cover every identity.

No spoken screen reader or real-device long-press test was performed; those confirmations belong to user acceptance under the specification.
