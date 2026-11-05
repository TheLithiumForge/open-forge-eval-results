// Knockout rules for players sharing one device: names, seeds, rounds, deals and results.
// Every function takes its inputs directly. A fresh deal comes from the draw a caller supplies.

export const PLAYER_COUNTS = [4, 8] as const;
const NAME_MIN_POINTS = 2;
const NAME_MAX_POINTS = 20;

export const NameNotice = {
  length: 'Use 2 to 20 characters.',
  repeated: 'Each name must be different.',
} as const;

export const Round = {
  quarterfinal: 'Quarterfinal',
  semifinal: 'Semifinal',
  final: 'Final',
} as const;
export type RoundName = (typeof Round)[keyof typeof Round];
const ROUND_ORDER: readonly RoundName[] = [Round.quarterfinal, Round.semifinal, Round.final];
const ROUND_BOARD_SIZE: Readonly<Record<RoundName, number>> = {
  [Round.quarterfinal]: 4,
  [Round.semifinal]: 6,
  [Round.final]: 8,
};

type Pair = readonly [number, number];
// Seeds follow entry order, so entry position 0 is seed 1. These are the opening matches in order.
const OPENING: Readonly<Record<number, readonly Pair[]>> = {
  4: [
    [0, 3],
    [1, 2],
  ],
  8: [
    [0, 7],
    [3, 4],
    [2, 5],
    [1, 6],
  ],
};

export interface Attempt {
  readonly moves: number;
  readonly elapsedMs: number;
}
export interface Match {
  readonly boardCode: string;
  // Entry positions. The first player plays the deal first.
  readonly players: Pair;
  readonly results: readonly [Attempt | null, Attempt | null];
}
export interface Tournament {
  readonly players: readonly string[];
  // A round is added once the previous round has a winner in every match.
  readonly rounds: readonly (readonly Match[])[];
}
export interface Turn {
  readonly round: number;
  readonly match: number;
  readonly player: 0 | 1;
}

// The stored and shown form of a typed name.
export function acceptedName(draft: string): string {
  return draft.trim().replace(/\s+/gu, ' ').normalize('NFC');
}

// The message that blocks accepting these names, or null when they can all be accepted.
export function nameProblem(names: readonly string[]): string | null {
  const lengths = names.map((name) => [...name].length);
  if (lengths.some((points) => points < NAME_MIN_POINTS || points > NAME_MAX_POINTS))
    return NameNotice.length;
  const keys = new Set(names.map((name) => name.toLowerCase()));
  return keys.size === names.length ? null : NameNotice.repeated;
}

export function roundNames(players: number): readonly RoundName[] {
  return ROUND_ORDER.slice(ROUND_ORDER.length - Math.log2(players));
}

export function roundBoardSize(round: RoundName): number {
  return ROUND_BOARD_SIZE[round];
}

// Fewer moves wins, then lower active time, then the higher seed. Seed 1 is the highest.
export function matchWinner(match: Match): number | null {
  const [first, second] = match.results;
  if (!first || !second) return null;
  const [one, two] = match.players;
  if (first.moves !== second.moves) return first.moves < second.moves ? one : two;
  if (first.elapsedMs !== second.elapsedMs) return first.elapsedMs < second.elapsedMs ? one : two;
  return Math.min(one, two);
}

// The pairs of the round after the last one, or null while a match is unfinished or after the final.
export function nextPairs(tournament: Tournament): readonly Pair[] | null {
  const last = tournament.rounds.at(-1);
  if (!last) return OPENING[tournament.players.length] ?? null;
  if (tournament.rounds.length >= roundNames(tournament.players.length).length) return null;
  const winners = last.map(matchWinner);
  const pairs: Pair[] = [];
  for (let index = 0; index + 1 < winners.length; index += 2) {
    const one = winners[index];
    const two = winners[index + 1];
    if (one === null || two === null || one === undefined || two === undefined) return null;
    pairs.push([one, two]);
  }
  return pairs;
}

function withNextRound(tournament: Tournament, draw: (size: number) => string): Tournament {
  const pairs = nextPairs(tournament);
  const round = roundNames(tournament.players.length)[tournament.rounds.length];
  if (!pairs || !round) return tournament;
  // Both players of a match share a deal, and no two matches of a tournament share one.
  const used = new Set(tournament.rounds.flat().map((match) => match.boardCode));
  const matches = pairs.map((players): Match => {
    let boardCode = draw(roundBoardSize(round));
    while (used.has(boardCode)) boardCode = draw(roundBoardSize(round));
    used.add(boardCode);
    return { boardCode, players, results: [null, null] };
  });
  return { ...tournament, rounds: [...tournament.rounds, matches] };
}

export function createTournament(
  players: readonly string[],
  draw: (size: number) => string,
): Tournament {
  return withNextRound({ players, rounds: [] }, draw);
}

export function currentTurn(tournament: Tournament): Turn | null {
  for (const [round, matches] of tournament.rounds.entries())
    for (const [match, { results }] of matches.entries()) {
      if (!results[0]) return { round, match, player: 0 };
      if (!results[1]) return { round, match, player: 1 };
    }
  return null;
}

export function recordResult(
  tournament: Tournament,
  attempt: Attempt,
  draw: (size: number) => string,
): Tournament {
  const turn = currentTurn(tournament);
  if (!turn) return tournament;
  const rounds = tournament.rounds.map((matches, round) =>
    round !== turn.round
      ? matches
      : matches.map((match, index): Match => {
          if (index !== turn.match) return match;
          return { ...match, results: turn.player ? [match.results[0], attempt] : [attempt, null] };
        }),
  );
  return withNextRound({ ...tournament, rounds }, draw);
}

export function champion(tournament: Tournament): number | null {
  if (tournament.rounds.length !== roundNames(tournament.players.length).length) return null;
  const final = tournament.rounds.at(-1)?.[0];
  return final ? matchWinner(final) : null;
}
