export interface TurnResult {
  readonly elapsedMs: number;
  readonly moves: number;
}

export interface Match {
  readonly boardCode: string;
  readonly results: readonly TurnResult[];
}

// Players are in entry order, so the first entry is seed 1. A match lists no players: they come
// from the opening pairs and from the winners of earlier matches.
export interface Tournament {
  readonly matches: readonly Match[];
  readonly players: readonly string[];
}
