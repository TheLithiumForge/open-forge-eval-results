import { freshBoardCode } from '../session/fresh-board.ts';

export interface Result {
  moves: number;
  elapsedMs: number;
}
export interface Match {
  players: [number, number];
  boardCode: string;
  results: (Result | null)[];
  winner: number | null;
}
export interface Tournament {
  version: 1;
  names: string[];
  size: number;
  rounds: Match[][];
  phase: 'ready' | 'playing' | 'turnFinished' | 'matchFinished' | 'complete';
  snapshot: string | null;
}

export function createTournament(names: string[], size: number): Tournament {
  const matches: Match[] = [];
  for (let i = 0; i < names.length; i += 2) {
    matches.push({
      players: [i, i + 1],
      boardCode: freshBoardCode(size),
      results: [null, null],
      winner: null,
    });
  }
  return { version: 1, names, size, rounds: [matches], phase: 'ready', snapshot: null };
}

export function currentMatch(tournament: Tournament): Match {
  const round = tournament.rounds[tournament.rounds.length - 1];
  if (!round) throw new Error('Missing round.');
  return round.find((match) => match.winner === null) ?? round[round.length - 1]!;
}

export function currentPlayer(match: Match): number {
  return match.results[0] === null ? match.players[0] : match.players[1];
}

export function recordResult(tournament: Tournament, result: Result): Tournament {
  const rounds = tournament.rounds.map((round) =>
    round.map((match) => ({ ...match, results: [...match.results] })),
  );
  const match = currentMatch({ ...tournament, rounds });
  if (!match.results[0]) {
    match.results[0] = result;
    return { ...tournament, rounds, phase: 'turnFinished', snapshot: null };
  }
  match.results[1] = result;
  const first = match.results[0];
  match.winner =
    first.moves < result.moves ||
    (first.moves === result.moves && first.elapsedMs <= result.elapsedMs)
      ? match.players[0]
      : match.players[1];
  return { ...tournament, rounds, phase: 'matchFinished', snapshot: null };
}

export function nextMatch(tournament: Tournament): Tournament {
  const round = tournament.rounds[tournament.rounds.length - 1]!;
  if (round.some((match) => match.winner === null)) return { ...tournament, phase: 'ready' };
  if (round.length === 1) return { ...tournament, phase: 'complete' };
  const next: Match[] = [];
  for (let i = 0; i < round.length; i += 2) {
    next.push({
      players: [round[i]!.winner!, round[i + 1]!.winner!],
      boardCode: freshBoardCode(tournament.size),
      results: [null, null],
      winner: null,
    });
  }
  return { ...tournament, rounds: [...tournament.rounds, next], phase: 'ready' };
}
