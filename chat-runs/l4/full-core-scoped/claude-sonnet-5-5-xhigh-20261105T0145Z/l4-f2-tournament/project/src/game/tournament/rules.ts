import { parseBoardCode } from '../deck.ts';

export const PLAYER_COUNTS = [4, 8] as const;
export const Round = {
  quarterfinal: 'Quarterfinal',
  semifinal: 'Semifinal',
  final: 'Final',
} as const;
type RoundName = (typeof Round)[keyof typeof Round];

// Boards grow with the stage: the Final is always 8x8.
const STAGE_SIZE: Readonly<Record<RoundName, number>> = {
  Quarterfinal: 4,
  Semifinal: 6,
  Final: 8,
};
// Entry order is the seed order, so seed 1 is index 0. These are the opening matches in bracket order.
const OPENING: Readonly<Record<number, readonly (readonly [number, number])[]>> = {
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

export interface Result {
  readonly moves: number;
  readonly elapsedMs: number;
}
export interface Match {
  readonly code: string;
  // Results in play order: the first listed player, then the second.
  readonly results: readonly [Result | null, Result | null];
}
export interface Tournament {
  readonly players: readonly string[];
  readonly matches: readonly Match[];
}
export interface Turn {
  readonly match: number;
  readonly slot: 0 | 1;
}
interface MatchInfo {
  readonly round: RoundName;
  readonly number: number;
  readonly size: number;
  readonly start: number;
  readonly width: number;
}

export function isPlayerCount(value: number): boolean {
  return PLAYER_COUNTS.some((count) => count === value);
}

export function roundNames(count: number): readonly RoundName[] {
  return count === 8
    ? [Round.quarterfinal, Round.semifinal, Round.final]
    : [Round.semifinal, Round.final];
}

// Matches are numbered through the whole bracket, one round after another.
export function matchInfo(count: number, index: number): MatchInfo | null {
  let start = 0;
  let width = count / 2;
  for (const round of roundNames(count)) {
    if (index >= start && index < start + width)
      return { round, number: index - start + 1, size: STAGE_SIZE[round], start, width };
    start += width;
    width /= 2;
  }
  return null;
}

export function dealSizes(count: number): readonly number[] {
  return Array.from({ length: count - 1 }, (_, index) => matchInfo(count, index)?.size ?? 0);
}

// Every match has its own full board code, and its size follows its stage.
export function hasValidDeals(count: number, codes: readonly string[]): boolean {
  const sizes = dealSizes(count);
  return (
    codes.length === sizes.length &&
    new Set(codes).size === codes.length &&
    codes.every((code, index) => parseBoardCode(code)?.size === sizes[index])
  );
}

export function createTournament(players: readonly string[], codes: readonly string[]): Tournament {
  if (!isPlayerCount(players.length) || !hasValidDeals(players.length, codes))
    throw new Error('Invalid tournament.');
  return { players, matches: codes.map((code) => ({ code, results: [null, null] })) };
}

// The two seeds of a match, or null for a place that an earlier match has not decided yet.
export function matchPlayers(
  tournament: Tournament,
  index: number,
): readonly [number | null, number | null] {
  const count = tournament.players.length;
  const opening = OPENING[count]?.[index];
  if (opening) return opening;
  const info = matchInfo(count, index);
  if (!info) return [null, null];
  const feeder = info.start - info.width * 2 + (info.number - 1) * 2;
  return [matchWinner(tournament, feeder), matchWinner(tournament, feeder + 1)];
}

// Fewer moves win, then less active time, then the higher seed (the lower index).
export function matchWinner(tournament: Tournament, index: number): number | null {
  const [first, second] = matchPlayers(tournament, index);
  const [one, two] = tournament.matches[index]?.results ?? [null, null];
  if (first === null || second === null || one === null || two === null) return null;
  const difference = one.moves - two.moves || one.elapsedMs - two.elapsedMs;
  if (difference === 0) return Math.min(first, second);
  return difference < 0 ? first : second;
}

export function nextTurn(tournament: Tournament): Turn | null {
  for (const [match, { results }] of tournament.matches.entries()) {
    if (results[0] === null) return { match, slot: 0 };
    if (results[1] === null) return { match, slot: 1 };
  }
  return null;
}

export function turnPlayer(tournament: Tournament, turn: Turn): number | null {
  return matchPlayers(tournament, turn.match)[turn.slot];
}

export function recordResult(tournament: Tournament, turn: Turn, result: Result): Tournament {
  const matches = tournament.matches.map((match, index) => {
    if (index !== turn.match) return match;
    const [first, second] = match.results;
    const results: Match['results'] = turn.slot === 0 ? [result, second] : [first, result];
    return { ...match, results };
  });
  return { ...tournament, matches };
}

export function champion(tournament: Tournament): number | null {
  return nextTurn(tournament) ? null : matchWinner(tournament, tournament.matches.length - 1);
}
