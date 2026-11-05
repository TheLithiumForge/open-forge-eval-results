export interface TournamentScore {
  readonly moves: number;
  readonly elapsedMs: number;
}

export interface TournamentMatch {
  readonly boardCode: string;
  readonly players: readonly [number | null, number | null];
  readonly results: readonly [TournamentScore | null, TournamentScore | null];
  readonly winner: number | null;
}

export interface TournamentState {
  readonly id: string;
  readonly players: readonly string[];
  readonly matches: readonly TournamentMatch[];
  readonly currentMatch: number;
  readonly turn: 0 | 1;
  readonly phase: 'ready' | 'playing' | 'turnComplete' | 'matchComplete' | 'complete';
  readonly snapshot: string | null;
}

export function createTournament(
  players: readonly string[],
  codes: readonly string[],
  id: string,
): TournamentState {
  if ((players.length !== 4 && players.length !== 8) || codes.length !== players.length - 1)
    throw new Error('A tournament needs 4 or 8 players and a deal for each match.');
  const matches = codes.map((boardCode, index): TournamentMatch => ({
    boardCode,
    players: index < players.length / 2 ? [index * 2, index * 2 + 1] : [null, null],
    results: [null, null],
    winner: null,
  }));
  return { id, players, matches, currentMatch: 0, turn: 0, phase: 'ready', snapshot: null };
}

export function currentTournamentMatch(tournament: TournamentState): TournamentMatch {
  const match = tournament.matches[tournament.currentMatch];
  if (!match) throw new Error('Missing tournament match.');
  return match;
}

function winnerOf(match: TournamentMatch): number | null {
  const [first, second] = match.results;
  if (!first || !second) return null;
  const firstWins =
    first.moves < second.moves ||
    (first.moves === second.moves && first.elapsedMs <= second.elapsedMs);
  return match.players[firstWins ? 0 : 1];
}

export function finishTournamentTurn(
  tournament: TournamentState,
  score: TournamentScore,
): TournamentState {
  if (tournament.phase !== 'playing' && tournament.phase !== 'ready') return tournament;
  const current = currentTournamentMatch(tournament);
  const results: TournamentMatch['results'] =
    tournament.turn === 0 ? [score, null] : [current.results[0], score];
  const scored = { ...current, results };
  const winner = winnerOf(scored);
  let matches = tournament.matches.map((match, index) =>
    index === tournament.currentMatch ? { ...scored, winner } : match,
  );
  if (winner !== null) {
    let start = 0;
    let width = tournament.players.length / 2;
    while (tournament.currentMatch >= start + width) {
      start += width;
      width /= 2;
    }
    const offset = tournament.currentMatch - start;
    const next = start + width + Math.floor(offset / 2);
    matches = matches.map((match, index): TournamentMatch => {
      if (index !== next) return match;
      return {
        ...match,
        players: offset % 2 === 0 ? [winner, match.players[1]] : [match.players[0], winner],
      };
    });
  }
  const phase =
    tournament.turn === 0
      ? 'turnComplete'
      : tournament.currentMatch === matches.length - 1
        ? 'complete'
        : 'matchComplete';
  return { ...tournament, matches, phase, snapshot: null };
}

export function advanceTournament(tournament: TournamentState): TournamentState {
  if (tournament.phase === 'turnComplete')
    return { ...tournament, turn: 1, phase: 'ready', snapshot: null };
  if (tournament.phase === 'matchComplete')
    return {
      ...tournament,
      currentMatch: tournament.currentMatch + 1,
      turn: 0,
      phase: 'ready',
      snapshot: null,
    };
  return tournament;
}
