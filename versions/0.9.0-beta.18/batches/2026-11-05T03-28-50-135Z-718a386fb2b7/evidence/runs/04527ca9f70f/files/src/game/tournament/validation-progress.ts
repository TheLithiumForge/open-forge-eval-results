import { isWon } from '../game.ts';
import type { TournamentMatch, TournamentState } from './model.ts';
import { matchSpecs } from './bracket.ts';

export function isValidTournamentProgress(
  count: number,
  matches: readonly TournamentMatch[],
  current: number,
  turn: number,
  status: unknown,
  champion: unknown,
): boolean {
  if (current >= matches.length) return false;
  const specs = matchSpecs(count);
  for (let index = 0; index < matches.length; index += 1) {
    const match = matches[index];
    const spec = specs[index];
    if (!match || !spec) return false;
    if (index < current && match.winnerSeed === null) return false;
    if (index > current && (match.winnerSeed !== null || match.results[0] || match.results[1]))
      return false;
    if (!spec.feeders) {
      if (
        match.playerSeeds[0] !== spec.playerSeeds[0] ||
        match.playerSeeds[1] !== spec.playerSeeds[1]
      )
        return false;
    } else if (index <= current) {
      const first = matches[spec.feeders[0]]?.winnerSeed;
      const second = matches[spec.feeders[1]]?.winnerSeed;
      if (first === null || first === undefined || second === null || second === undefined)
        return false;
      if (match.playerSeeds[0] !== first || match.playerSeeds[1] !== second) return false;
    } else if (match.playerSeeds[0] !== null || match.playerSeeds[1] !== null) return false;
  }
  const activeMatch = matches[current];
  if (
    !activeMatch ||
    (turn === 1 && !activeMatch.results[0]) ||
    (turn === 0 && activeMatch.results[1])
  )
    return false;
  if (status === 'finished') {
    return (
      current === matches.length - 1 &&
      matches.every((match) => match.winnerSeed !== null) &&
      champion === matches.at(-1)?.winnerSeed
    );
  }
  return champion === null && !(current === matches.length - 1 && activeMatch.winnerSeed !== null);
}

export function isValidTournamentGame(state: TournamentState): boolean {
  const game = state.activeGame;
  if (!game) return true;
  const match = state.matches[state.currentMatch];
  return (
    state.status === 'active' &&
    match?.boardCode === game.boardCode &&
    !match.results[state.currentTurn] &&
    !isWon(game)
  );
}
