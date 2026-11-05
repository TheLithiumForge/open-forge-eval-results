import { isJsonObject } from '../saved-format.ts';
import type { Tournament } from './tournament.ts';

// Establish the primitive structure before the format checks its invariants.
export function isTournamentShape(value: unknown): value is Tournament {
  if (
    !isJsonObject(value) ||
    !Array.isArray(value.names) ||
    !value.names.every((n) => typeof n === 'string') ||
    !Array.isArray(value.rounds) ||
    typeof value.round !== 'number' ||
    typeof value.match !== 'number' ||
    !['ready', 'playing', 'turnDone', 'matchDone', 'champion'].includes(String(value.phase)) ||
    !(value.game === null || typeof value.game === 'string')
  )
    return false;
  return value.rounds.every(
    (round) =>
      Array.isArray(round) &&
      round.every((match: unknown) => {
        if (
          !isJsonObject(match) ||
          !Array.isArray(match.players) ||
          match.players.length !== 2 ||
          !match.players.every((p) => typeof p === 'number') ||
          typeof match.code !== 'string' ||
          !Array.isArray(match.results) ||
          match.results.length !== 2 ||
          !(match.winner === null || typeof match.winner === 'number')
        )
          return false;
        return match.results.every(
          (result) =>
            result === null ||
            (isJsonObject(result) &&
              typeof result.moves === 'number' &&
              typeof result.elapsedMs === 'number'),
        );
      }),
  );
}
