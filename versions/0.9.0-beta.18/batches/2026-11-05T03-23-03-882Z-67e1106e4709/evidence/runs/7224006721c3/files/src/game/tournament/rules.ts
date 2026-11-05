import { parseBoardCode } from '../deck.ts';

export interface TournamentResult {
  readonly elapsedMs: number;
  readonly moves: number;
}
interface TournamentMatch {
  readonly boardCode: string;
  readonly results: readonly TournamentResult[];
}
export interface TournamentRecord {
  readonly players: readonly string[];
  readonly matches: readonly TournamentMatch[];
}
export const TournamentPhase = {
  ready: 'ready',
  playing: 'playing',
  turnResult: 'turn-result',
  matchResult: 'match-result',
  complete: 'complete',
} as const;
export type TournamentPhase = (typeof TournamentPhase)[keyof typeof TournamentPhase];

export function normalizeName(name: string): string {
  return name.trim().replace(/\s+/gu, ' ').normalize('NFC');
}

export function nameProblem(names: readonly string[]): string | null {
  if (names.some((name) => [...name].length < 2 || [...name].length > 20))
    return 'Use 2 to 20 characters.';
  if (new Set(names.map((name) => name.toLowerCase())).size !== names.length)
    return 'Each name must be different.';
  return null;
}

export function tournamentRound(players: number, index: number) {
  let count = players / 2;
  while (index >= count && count > 1) {
    index -= count;
    count /= 2;
  }
  if (count === 4) return { name: 'Quarterfinal', size: 4 };
  if (count === 2) return { name: 'Semifinal', size: 6 };
  return { name: 'Final', size: 8 };
}

export function createTournament(
  names: readonly string[],
  codes: readonly string[],
): TournamentRecord {
  const players = names.map(normalizeName);
  if (players.length !== 4 && players.length !== 8) throw new Error('Invalid tournament players.');
  const problem = nameProblem(players);
  if (problem) throw new Error(problem);
  if (codes.length !== players.length - 1 || new Set(codes).size !== codes.length)
    throw new Error('Invalid tournament deals.');
  const matches = codes.map((code, index) => {
    if (parseBoardCode(code)?.size !== tournamentRound(players.length, index).size)
      throw new Error('Invalid tournament deal size.');
    return { boardCode: code, results: [] };
  });
  return { players, matches };
}

export function matchPlayers(event: TournamentRecord, index: number): readonly (number | null)[] {
  const opening = event.players.length / 2;
  if (index < opening) {
    const pairings =
      opening === 2
        ? [
            [1, 4],
            [2, 3],
          ]
        : [
            [1, 8],
            [4, 5],
            [3, 6],
            [2, 7],
          ];
    return pairings[index] ?? [null, null];
  }
  let start = opening;
  let count = opening / 2;
  let previousStart = 0;
  while (index >= start + count && count > 1) {
    previousStart = start;
    start += count;
    count /= 2;
  }
  const first = previousStart + (index - start) * 2;
  return [matchWinner(event, first), matchWinner(event, first + 1)];
}

export function matchWinner(event: TournamentRecord, index: number): number | null {
  const match = event.matches[index];
  const first = match?.results[0];
  const second = match?.results[1];
  if (!first || !second) return null;
  const players = matchPlayers(event, index);
  const left = players[0];
  const right = players[1];
  if (left == null || right == null) return null;
  const comparison =
    first.moves - second.moves || first.elapsedMs - second.elapsedMs || left - right;
  return comparison <= 0 ? left : right;
}

export function recordTournamentResult(
  event: TournamentRecord,
  index: number,
  result: TournamentResult,
): TournamentRecord {
  const match = event.matches[index];
  if (!match || match.results.length >= 2 || matchPlayers(event, index).includes(null))
    return event;
  if (event.matches.slice(0, index).some((previous) => previous.results.length !== 2)) return event;
  return {
    ...event,
    matches: event.matches.map((item, position) =>
      position === index ? { ...item, results: [...item.results, result] } : item,
    ),
  };
}
