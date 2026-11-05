---
open-forge:
  description: Tournament mode choices awaiting product confirmation and gaps found
    while building it
  tags: [Memory, Emerging, Contextual, Candidate, Tournament]
---

# Tournament mode open questions

Source: implementation of tournament mode on 2026-11-05. The requested behavior is accepted; the items below are not.

## Choices awaiting confirmation

The implementation choices are listed, with the file that holds each, under "Implementation choices" in [Tournament mode](../../../docs/competition/competition-flow.md). The ones most likely to need a product answer:

- Who plays first in a match (currently the first listed player: higher seed in the opening round, bracket order later).
- Hiding the finished board between the two turns of a match, so the second player can't study the deal.
- Export holds recorded results only, so loading restarts a turn in progress.
- `docs/interface/controls.md` gained C15 for the Tournament button without a spec version change. Whether this is spec 2.3 is a release decision.

## Gaps observed, not changed

- Snapshot and replay imports still show no "Unknown field: NAME." diagnostic, as [Import safety policy](../../../docs/sharing/import-safety-policy.md) already records. Observed in source.
- `npm run format:check` fails on most `docs/` and `.agents/` files in the original commit. Observed by checking the committed copies.
- Checks ran on Node 22.23.4 and Chromium 153 without the named-combination flag. The named combination hasn't been run for this change.
