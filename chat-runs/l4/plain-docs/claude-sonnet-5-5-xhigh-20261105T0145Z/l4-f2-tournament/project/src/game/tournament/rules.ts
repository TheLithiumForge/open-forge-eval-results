import type { Match, Tournament, TurnResult } from './types.ts';

export const PLAYER_COUNTS = [4, 8] as const;
export const MAX_PLAYERS = 8;
const Round = {
  quarterfinal: 'Quarterfinal',
  semifinal: 'Semifinal',
  final: 'Final',
} as const;
type RoundName = (typeof Round)[keyof typeof Round];

const BOARD_SIZE = { [Round.quarterfinal]: 4, [Round.semifinal]: 6, [Round.final]: 8 } as const;
// Entry positions from zero. Seed 1 is the first entry. These are literal so that the order of the
// eight-person case can't drift from "1 against 8, 4 against 5, 3 against 6, then 2 against 7".
const OPENING_FOUR = [
  [0, 3],
  [1, 2],
] as const;
const OPENING_EIGHT = [
  [0, 7],
  [3, 4],
  [2, 5],
  [1, 6],
] as const;
const DRAW_ATTEMPTS = 64;

export function isPlayerCount(value: number): boolean {
  return PLAYER_COUNTS.some((count) => count === value);
}

export function openingPairs(count: number): readonly (readonly [number, number])[] {
  return count === 8 ? OPENING_EIGHT : OPENING_FOUR;
}

export function roundOf(count: number, match: number): RoundName {
  if (match === count - 2) return Round.final;
  return count === 8 && match < count / 2 ? Round.quarterfinal : Round.semifinal;
}

export function boardSize(round: RoundName): number {
  return BOARD_SIZE[round];
}

// "Quarterfinal 1", "Semifinal 2" or "Final".
export function matchLabel(count: number, match: number): string {
  const round = roundOf(count, match);
  if (round === Round.final) return round;
  const first = round === Round.semifinal && count === 8 ? count / 2 : 0;
  return `${round} ${match - first + 1}`;
}

// The two earlier matches whose winners meet in this one, or undefined for an opening match.
export function feedersOf(count: number, match: number): readonly [number, number] | undefined {
  if (match < count / 2) return undefined;
  let previous = 0;
  let start = count / 2;
  for (let size = count / 4; size >= 1; size /= 2) {
    if (match < start + size) {
      const offset = (match - start) * 2;
      return [previous + offset, previous + offset + 1];
    }
    previous = start;
    start += size;
  }
  return undefined;
}

// Draws one board code per match. A different full code is used for every match.
export function drawBoardCodes(count: number, draw: (size: number) => string): string[] {
  const codes: string[] = [];
  for (let match = 0; match < count - 1; match += 1) {
    const size = boardSize(roundOf(count, match));
    let code = draw(size);
    for (let attempt = 1; codes.includes(code); attempt += 1) {
      if (attempt >= DRAW_ATTEMPTS) throw new Error('Could not draw a different board code.');
      code = draw(size);
    }
    codes.push(code);
  }
  return codes;
}

export function createTournament(players: readonly string[], codes: readonly string[]): Tournament {
  return {
    players,
    matches: codes.map((boardCode): Match => ({ boardCode, results: [] })),
  };
}

// Fewer moves win. Equal moves go to the lower active time, then to the higher seed.
export function isAhead(a: TurnResult, aSeed: number, b: TurnResult, bSeed: number): boolean {
  if (a.moves !== b.moves) return a.moves < b.moves;
  if (a.elapsedMs !== b.elapsedMs) return a.elapsedMs < b.elapsedMs;
  return aSeed < bSeed;
}

export function winnerOf(tournament: Tournament, match: number): number | undefined {
  const [first, second] = matchPlayers(tournament, match);
  const results = tournament.matches[match]?.results;
  const a = results?.[0];
  const b = results?.[1];
  if (first === undefined || second === undefined || !a || !b) return undefined;
  return isAhead(a, first, b, second) ? first : second;
}

// Entry positions of the two players, first to play first. Undefined until earlier matches finish.
export function matchPlayers(
  tournament: Tournament,
  match: number,
): readonly [number | undefined, number | undefined] {
  const count = tournament.players.length;
  const feeders = feedersOf(count, match);
  if (!feeders) {
    const pair = openingPairs(count)[match];
    return pair ?? [undefined, undefined];
  }
  return [winnerOf(tournament, feeders[0]), winnerOf(tournament, feeders[1])];
}

export function recordedTurns(tournament: Tournament): number {
  return tournament.matches.reduce((total, match) => total + match.results.length, 0);
}

export function isFinished(tournament: Tournament): boolean {
  return (
    tournament.matches.length > 0 && recordedTurns(tournament) === tournament.matches.length * 2
  );
}

interface Turn {
  readonly match: number;
  readonly second: boolean;
  readonly player: number;
}

// Turn number k counts from zero in play order: two per match, the lower seed's listing first.
export function turnAt(tournament: Tournament, k: number): Turn | undefined {
  const match = Math.floor(k / 2);
  const second = k % 2 === 1;
  const player = matchPlayers(tournament, match)[second ? 1 : 0];
  return player === undefined ? undefined : { match, second, player };
}

export function recordResult(tournament: Tournament, result: TurnResult): Tournament {
  const k = recordedTurns(tournament);
  if (isFinished(tournament)) return tournament;
  const target = Math.floor(k / 2);
  return {
    ...tournament,
    matches: tournament.matches.map((match, index) =>
      index === target ? { ...match, results: [...match.results, result] } : match,
    ),
  };
}

export function championOf(tournament: Tournament): number | undefined {
  return isFinished(tournament) ? winnerOf(tournament, tournament.matches.length - 1) : undefined;
}

// Time is kept in whole milliseconds so that stored, exported and compared values agree.
export function resultOf(game: { readonly moves: number; readonly elapsedMs: number }): TurnResult {
  return { moves: game.moves, elapsedMs: Math.floor(game.elapsedMs) };
}
