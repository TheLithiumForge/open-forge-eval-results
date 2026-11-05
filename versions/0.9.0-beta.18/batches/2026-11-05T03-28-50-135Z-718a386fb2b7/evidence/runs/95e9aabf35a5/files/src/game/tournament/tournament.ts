interface Result {
  moves: number;
  elapsedMs: number;
}
interface Match {
  players: [number | null, number | null];
  results: [Result | null, Result | null];
  boardCode: string | null;
  winner: number | null;
}
export interface Tournament {
  version: 1;
  id: string;
  names: string[];
  size: number;
  rounds: Match[][];
  round: number;
  match: number;
  phase: 'ready' | 'playing' | 'turnEnd' | 'matchEnd' | 'complete';
}

export function createTournament(names: string[], size: number, id: string): Tournament {
  const rounds: Match[][] = [];
  for (let count = names.length / 2; count >= 1; count /= 2) {
    rounds.push(
      Array.from({ length: count }, () => ({
        players: [null, null],
        results: [null, null],
        boardCode: null,
        winner: null,
      })),
    );
  }
  rounds[0]?.forEach((match, index) => {
    match.players = [index * 2, index * 2 + 1];
  });
  return { version: 1, id, names, size, rounds, round: 0, match: 0, phase: 'ready' };
}

export function currentMatch(tournament: Tournament): Match {
  const match = tournament.rounds[tournament.round]?.[tournament.match];
  if (!match) throw new Error('Missing tournament match.');
  return match;
}

export function currentPlayer(tournament: Tournament): number {
  const match = currentMatch(tournament);
  const player = match.players[match.results[0] ? 1 : 0];
  if (player === null) throw new Error('Missing tournament player.');
  return player;
}

export function startTurn(tournament: Tournament, code: string): Tournament {
  const next = structuredClone(tournament);
  currentMatch(next).boardCode = code;
  next.phase = 'playing';
  return next;
}

export function finishTurn(tournament: Tournament, result: Result): Tournament {
  const next = structuredClone(tournament);
  const match = currentMatch(next);
  if (!match.results[0]) {
    match.results[0] = result;
    next.phase = 'turnEnd';
  } else {
    match.results[1] = result;
    const first = match.results[0];
    const firstWins =
      first.moves < result.moves ||
      (first.moves === result.moves && first.elapsedMs <= result.elapsedMs);
    match.winner = match.players[firstWins ? 0 : 1];
    const following = next.rounds[next.round + 1]?.[Math.floor(next.match / 2)];
    if (following) following.players[next.match % 2] = match.winner;
    next.phase = following ? 'matchEnd' : 'complete';
  }
  return next;
}

export function advanceTournament(tournament: Tournament): Tournament {
  const next = structuredClone(tournament);
  if (next.phase === 'turnEnd') next.phase = 'ready';
  else if (next.phase === 'matchEnd') {
    if (next.match + 1 < (next.rounds[next.round]?.length ?? 0)) next.match += 1;
    else {
      next.round += 1;
      next.match = 0;
    }
    next.phase = 'ready';
  }
  return next;
}
