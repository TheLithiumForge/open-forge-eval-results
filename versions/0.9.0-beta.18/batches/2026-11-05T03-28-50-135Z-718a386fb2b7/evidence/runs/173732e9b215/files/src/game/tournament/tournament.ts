export interface Score {
  moves: number;
  elapsedMs: number;
}
export interface Match {
  players: [number | null, number | null];
  scores: [Score | null, Score | null];
  winner: number | null;
  boardCode: string | null;
}
type Phase = 'ready' | 'playing' | 'turnDone' | 'matchDone' | 'complete';
export interface TournamentData {
  version: 1;
  size: number;
  names: string[];
  rounds: Match[][];
  round: number;
  match: number;
  turn: number;
  phase: Phase;
  snapshot: string | null;
}

export function createTournament(names: string[], size: number): TournamentData {
  const rounds: Match[][] = [];
  for (let count = names.length / 2; count >= 1; count /= 2) {
    rounds.push(
      Array.from({ length: count }, (_, index) => ({
        players: rounds.length === 0 ? [index * 2, index * 2 + 1] : [null, null],
        scores: [null, null],
        winner: null,
        boardCode: null,
      })),
    );
  }
  return {
    version: 1,
    size,
    names,
    rounds,
    round: 0,
    match: 0,
    turn: 0,
    phase: 'ready',
    snapshot: null,
  };
}

export function currentMatch(data: TournamentData): Match {
  const match = data.rounds[data.round]?.[data.match];
  if (!match) throw new Error('Invalid tournament position.');
  return match;
}

export function updateMatch(data: TournamentData, match: Match): TournamentData {
  return {
    ...data,
    rounds: data.rounds.map((round, r) =>
      r === data.round ? round.map((item, m) => (m === data.match ? match : item)) : round,
    ),
  };
}

export function recordScore(data: TournamentData, score: Score): TournamentData {
  const match = currentMatch(data);
  const scores: [Score | null, Score | null] =
    data.turn === 0 ? [score, null] : [match.scores[0], score];
  if (data.turn === 0)
    return { ...updateMatch(data, { ...match, scores }), phase: 'turnDone', snapshot: null };
  const first = scores[0];
  if (!first) throw new Error('Missing first score.');
  const comparison = first.moves - score.moves || first.elapsedMs - score.elapsedMs;
  if (comparison === 0)
    return {
      ...updateMatch(data, { ...match, scores: [null, null], boardCode: null }),
      phase: 'ready',
      turn: 0,
      snapshot: null,
    };
  const winner = match.players[comparison < 0 ? 0 : 1];
  if (winner === null) throw new Error('Missing player.');
  return { ...updateMatch(data, { ...match, scores, winner }), phase: 'matchDone', snapshot: null };
}

export function advanceMatch(data: TournamentData): TournamentData {
  const winner = currentMatch(data).winner;
  if (winner === null) throw new Error('Missing winner.');
  if (data.round === data.rounds.length - 1) return { ...data, phase: 'complete' };
  const nextRound = data.round + 1;
  const nextMatch = Math.floor(data.match / 2);
  const rounds = data.rounds.map((round, r) =>
    r !== nextRound
      ? round
      : round.map((match, m) => {
          if (m !== nextMatch) return match;
          const players: [number | null, number | null] = [...match.players];
          players[data.match % 2] = winner;
          return { ...match, players };
        }),
  );
  const atEnd = data.match + 1 === data.rounds[data.round]?.length;
  return {
    ...data,
    rounds,
    round: atEnd ? nextRound : data.round,
    match: atEnd ? 0 : data.match + 1,
    turn: 0,
    phase: 'ready',
  };
}
