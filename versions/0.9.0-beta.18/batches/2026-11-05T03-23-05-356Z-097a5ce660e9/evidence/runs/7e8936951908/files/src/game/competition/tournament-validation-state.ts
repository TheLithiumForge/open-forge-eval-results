import type { Tournament, TournamentMatch, TournamentPhase } from './tournament.ts';

export function isTournamentProgressValid(
  matches: readonly TournamentMatch[],
  count: number,
): boolean {
  if (matches.length !== (count === 4 ? 3 : 7)) return false;
  const roundCount = count === 4 ? 2 : 3;
  for (let round = 2; round <= roundCount; round += 1) {
    const priorRound = matches.filter((match) => match.round === round - 1);
    const nextRound = matches.filter((match) => match.round === round);
    if (priorRound.length !== nextRound.length * 2) return false;
    const priorComplete = priorRound.every((match) => match.winner !== null);
    const assigned = nextRound.some((match) => match.players.some((seed) => seed !== null));
    if (!priorComplete && assigned) return false;
    if (!assigned) continue;
    if (!priorComplete) return false;
    for (let index = 0; index < nextRound.length; index += 1) {
      const first = priorRound[index * 2]?.winner ?? null;
      const second = priorRound[index * 2 + 1]?.winner ?? null;
      if (nextRound[index]?.players[0] !== first || nextRound[index]?.players[1] !== second)
        return false;
    }
  }
  return true;
}

export function isTournamentPhaseValid(tournament: Tournament): boolean {
  const match = tournament.matches[tournament.currentMatch];
  if (!match) return false;
  const sameRound = tournament.matches
    .map((item, index) => ({ item, index }))
    .filter(({ item }) => item.round === match.round);
  if (sameRound.some(({ item, index }) => index < tournament.currentMatch && item.winner === null))
    return false;
  if (sameRound.some(({ item, index }) => index > tournament.currentMatch && item.winner !== null))
    return false;
  const first = match.results[0];
  const second = match.results[1];
  if (tournament.phase === 'ready' || tournament.phase === 'playing') {
    return (
      match.winner === null &&
      (tournament.turn === 0
        ? first === null && second === null
        : first !== null && second === null) &&
      match.players[tournament.turn] !== null &&
      tournament.champion === null
    );
  }
  if (tournament.phase === 'turn-finished')
    return (
      tournament.turn === 0 && first !== null && second === null && tournament.champion === null
    );
  if (tournament.phase === 'match-finished')
    return (
      tournament.turn === 1 &&
      match.winner !== null &&
      first !== null &&
      second !== null &&
      tournament.champion === null
    );
  return (
    tournament.turn === 1 &&
    match.stage === 'Final' &&
    match.winner !== null &&
    tournament.champion === match.winner &&
    tournament.matches.every((item) => item.winner !== null)
  );
}

export function readTournamentPhase(value: unknown): TournamentPhase | null {
  if (
    value === 'ready' ||
    value === 'playing' ||
    value === 'turn-finished' ||
    value === 'match-finished' ||
    value === 'finished'
  )
    return value;
  return null;
}
