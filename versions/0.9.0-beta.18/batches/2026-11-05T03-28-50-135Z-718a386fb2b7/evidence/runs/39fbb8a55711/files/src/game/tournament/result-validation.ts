import { ELAPSED_MAX_MS, MOVES_MAX } from '../game.ts';
import type { TournamentResult } from './rules.ts';

export function tournamentWinner(
  playerSeeds: readonly [number, number],
  results: readonly [TournamentResult, TournamentResult],
): number {
  const [first, second] = results;
  if (first.moves !== second.moves)
    return first.moves < second.moves ? playerSeeds[0] : playerSeeds[1];
  if (first.elapsedMs !== second.elapsedMs)
    return first.elapsedMs < second.elapsedMs ? playerSeeds[0] : playerSeeds[1];
  return Math.min(playerSeeds[0], playerSeeds[1]);
}

export function isValidTournamentResult(value: TournamentResult, size: number): boolean {
  return (
    Number.isInteger(value.moves) &&
    value.moves >= (size * size) / 2 &&
    value.moves <= MOVES_MAX &&
    Number.isFinite(value.elapsedMs) &&
    value.elapsedMs >= 0 &&
    value.elapsedMs <= ELAPSED_MAX_MS
  );
}
