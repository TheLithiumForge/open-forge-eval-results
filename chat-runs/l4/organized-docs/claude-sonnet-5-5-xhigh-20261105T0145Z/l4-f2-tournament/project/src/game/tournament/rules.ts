export const PLAYER_COUNTS = [4, 8] as const;
export type PlayerCount = (typeof PLAYER_COUNTS)[number];

const Round = {
  quarterfinal: 'Quarterfinal',
  semifinal: 'Semifinal',
  final: 'Final',
} as const;
type RoundName = (typeof Round)[keyof typeof Round];

// Each stage uses a supported board side length.
const ROUND_SIZES: Readonly<Record<RoundName, number>> = {
  [Round.quarterfinal]: 4,
  [Round.semifinal]: 6,
  [Round.final]: 8,
};

// Seeds follow entry order, so the first player entered is seed 1. Opening matches are listed in
// bracket order, and each later match takes the winners of the two matches in its entry.
const OPENING: Readonly<Record<PlayerCount, readonly (readonly [number, number])[]>> = {
  4: [
    [1, 4],
    [2, 3],
  ],
  8: [
    [1, 8],
    [4, 5],
    [3, 6],
    [2, 7],
  ],
};
const FEEDERS: Readonly<Record<PlayerCount, readonly (readonly [number, number])[]>> = {
  4: [[0, 1]],
  8: [
    [0, 1],
    [2, 3],
    [4, 5],
  ],
};

export interface Result {
  readonly moves: number;
  readonly elapsedMs: number;
}
export interface Match {
  readonly boardCode: string;
  readonly results: readonly Result[];
}
// A tournament without matches has not started. Its players are an unchecked draft.
export interface Tournament {
  readonly players: readonly string[];
  readonly matches: readonly Match[];
}
export interface Turn {
  readonly match: number;
  readonly seat: number;
}

export function isPlayerCount(value: number): value is PlayerCount {
  return PLAYER_COUNTS.some((count) => count === value);
}

function openingOf(count: number): readonly (readonly [number, number])[] {
  return isPlayerCount(count) ? OPENING[count] : [];
}

function feedersOf(count: number): readonly (readonly [number, number])[] {
  return isPlayerCount(count) ? FEEDERS[count] : [];
}

export function matchCount(count: number): number {
  return count - 1;
}

export function roundOf(count: number, match: number): RoundName {
  const opening = openingOf(count).length;
  if (match === matchCount(count) - 1) return Round.final;
  return match < opening && count === 8 ? Round.quarterfinal : Round.semifinal;
}

export function boardSizeOf(count: number, match: number): number {
  return ROUND_SIZES[roundOf(count, match)];
}

export function createTournament(players: readonly string[], codes: readonly string[]): Tournament {
  return { players, matches: codes.map((boardCode) => ({ boardCode, results: [] })) };
}

export function hasStarted(tournament: Tournament): boolean {
  return tournament.matches.length > 0;
}

// Fewer moves win, then less active time, then the better seed (the lower number).
export function pickWinner(
  first: { readonly seed: number; readonly result: Result },
  second: { readonly seed: number; readonly result: Result },
): number {
  if (first.result.moves !== second.result.moves)
    return first.result.moves < second.result.moves ? first.seed : second.seed;
  if (first.result.elapsedMs !== second.result.elapsedMs)
    return first.result.elapsedMs < second.result.elapsedMs ? first.seed : second.seed;
  return Math.min(first.seed, second.seed);
}

export function winnerOf(tournament: Tournament, match: number): number | null {
  const seeds = seedsOf(tournament, match);
  const results = tournament.matches[match]?.results ?? [];
  const [first, second] = seeds ?? [];
  const [one, two] = results;
  if (first === undefined || second === undefined || !one || !two) return null;
  return pickWinner({ seed: first, result: one }, { seed: second, result: two });
}

// The two seeds of a match, better seed first, or null while an earlier match is undecided.
export function seedsOf(tournament: Tournament, match: number): readonly [number, number] | null {
  const count = tournament.players.length;
  const opening = openingOf(count);
  const pair = opening[match];
  if (pair) return pair;
  const feeders = feedersOf(count)[match - opening.length];
  if (!feeders) return null;
  const left = winnerOf(tournament, feeders[0]);
  const right = winnerOf(tournament, feeders[1]);
  if (left === null || right === null) return null;
  return left < right ? [left, right] : [right, left];
}

export function nextTurn(tournament: Tournament): Turn | null {
  const match = tournament.matches.findIndex((entry) => entry.results.length < 2);
  const entry = tournament.matches[match];
  return entry ? { match, seat: entry.results.length } : null;
}

export function recordResult(tournament: Tournament, result: Result): Tournament {
  const turn = nextTurn(tournament);
  if (!turn) return tournament;
  return {
    ...tournament,
    matches: tournament.matches.map((entry, index) =>
      index === turn.match ? { ...entry, results: [...entry.results, result] } : entry,
    ),
  };
}

export function championOf(tournament: Tournament): number | null {
  return hasStarted(tournament) ? winnerOf(tournament, tournament.matches.length - 1) : null;
}

export function isFinished(tournament: Tournament): boolean {
  return championOf(tournament) !== null;
}

// The name of a seed, which counts from 1.
export function nameOf(tournament: Tournament, seed: number | null): string {
  return seed === null ? '' : (tournament.players[seed - 1] ?? '');
}

export function runnerUpOf(tournament: Tournament): number | null {
  const final = tournament.matches.length - 1;
  const seeds = seedsOf(tournament, final);
  const champion = championOf(tournament);
  return seeds && champion !== null ? (seeds.find((seed) => seed !== champion) ?? null) : null;
}
