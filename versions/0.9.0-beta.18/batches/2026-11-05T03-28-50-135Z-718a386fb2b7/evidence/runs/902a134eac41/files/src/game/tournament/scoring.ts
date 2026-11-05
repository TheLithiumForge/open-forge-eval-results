import type { TournamentResult } from './model.ts';

export function winningSeed(
  firstSeed: number,
  first: TournamentResult,
  secondSeed: number,
  second: TournamentResult,
): number {
  if (first.moves !== second.moves) return first.moves < second.moves ? firstSeed : secondSeed;
  if (first.elapsedMs !== second.elapsedMs)
    return first.elapsedMs < second.elapsedMs ? firstSeed : secondSeed;
  return Math.min(firstSeed, secondSeed);
}
