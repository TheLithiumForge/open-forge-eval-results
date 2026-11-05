---
open-forge:
  description: Choices made while building Tournament mode that the user hasn't accepted yet
  tags: [Memory, Emerging, Contextual, Candidate, Competition]
---

# Tournament mode open choices

Source: the agent that built Tournament mode on 2026-11-05. These are its own choices, not accepted direction. The shipped behavior is in `docs/competition/competition-tournament.md`.

- Load tournament replaces an unfinished tournament without the leave dialog, as Load snapshot does. The dialog policy could be read to require one.
- Exporting during a turn leaves the unfinished game out, so loading restarts that turn on the same deal.
- The final's last game leads straight to the champion screen, with no Next match.
- The product spec stays at version 2.2. Adding the mode may call for 2.3 and a release note.
- Snapshot import still shows "Invalid snapshot." for an unknown field. The import safety policy asks for "Unknown field: NAME." there too.
- The solo screen gained a visible "Solo game" h2 so Back to game has a focus target.
