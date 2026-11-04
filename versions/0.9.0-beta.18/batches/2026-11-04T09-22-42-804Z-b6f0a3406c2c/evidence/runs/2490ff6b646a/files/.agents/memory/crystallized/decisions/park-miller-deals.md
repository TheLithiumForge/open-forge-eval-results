---
open-forge:
  description: Decision to generate reproducible deals with the Park-Miller generator
  tags:
    - Game
    - Decision
    - Reproducibility
---
# Park-Miller Generator for Deals

Decided when board codes were added.

Board codes need the same deal in every browser and in Node, now and later. `Math.random` can't be seeded, and the xorshift variant we tried gave different results once a value passed the safe integer range in one runtime. The Park-Miller generator stays inside safe integers with plain multiplication and modulo, so it reproduces exactly.

Changing the generator would change every deal, so a new generator needs a new board code version.

Status: accepted.
