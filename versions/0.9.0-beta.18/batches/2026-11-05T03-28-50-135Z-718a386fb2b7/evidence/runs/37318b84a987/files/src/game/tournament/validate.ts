import { isJsonObject } from '../saved-format.ts';
import { isTournamentCode, isTournamentResult, normalizeNames, roundSize } from './rules.ts';
import type { Tournament } from './rules.ts';

function fields(value: unknown, keys: string[]): string | null {
  if (!isJsonObject(value)) return 'Invalid tournament.';
  for (const key of Object.keys(value)) if (!keys.includes(key)) return `Unknown field: ${key}.`;
  return keys.every((key) => Object.hasOwn(value, key)) ? null : 'Invalid tournament.';
}
export function tournamentFields(value: unknown): string | null {
  let error = fields(value, [
    'names',
    'matches',
    'currentRound',
    'currentMatch',
    'turn',
    'phase',
    'snapshot',
  ]);
  if (error || !isJsonObject(value)) return error;
  if (!Array.isArray(value.matches)) return 'Invalid tournament.';
  for (const round of value.matches) {
    if (!Array.isArray(round)) return 'Invalid tournament.';
    for (const match of round) {
      error = fields(match, ['players', 'results', 'code', 'winner']);
      if (error || !isJsonObject(match)) return error;
      if (!Array.isArray(match.results)) return 'Invalid tournament.';
      for (const result of match.results)
        if (result !== null) {
          error = fields(result, ['moves', 'elapsedMs']);
          if (error) return error;
        }
    }
  }
  return null;
}
export function isTournament(value: unknown): value is Tournament {
  if (
    !isJsonObject(value) ||
    !Array.isArray(value.names) ||
    ![4, 8].includes(value.names.length) ||
    value.names.some((name) => typeof name !== 'string')
  )
    return false;
  const names = normalizeNames(value.names);
  if (typeof names === 'string' || JSON.stringify(names) !== JSON.stringify(value.names))
    return false;
  const lengths = value.names.length === 4 ? [2, 1] : [4, 2, 1];
  if (!Array.isArray(value.matches) || value.matches.length !== lengths.length) return false;
  const seen = new Set<string>();
  for (let r = 0; r < lengths.length; r++) {
    const round = value.matches[r];
    if (!Array.isArray(round) || round.length !== lengths[r]) return false;
    for (const match of round) {
      if (
        !isJsonObject(match) ||
        !isTournamentCode(match.code, roundSize(round.length)) ||
        seen.has(match.code) ||
        !Array.isArray(match.players) ||
        match.players.length !== 2 ||
        !Array.isArray(match.results) ||
        match.results.length !== 2
      )
        return false;
      if (
        !match.players.every(
          (seed) => seed === null || (Number.isInteger(seed) && seed >= 1 && seed <= names.length),
        )
      )
        return false;
      if (
        match.winner !== null &&
        (!Number.isInteger(match.winner) ||
          typeof match.winner !== 'number' ||
          match.winner < 1 ||
          match.winner > names.length)
      )
        return false;
      if (
        !match.results.every(
          (result) => result === null || isTournamentResult(result, roundSize(round.length)),
        )
      )
        return false;
      seen.add(match.code);
    }
  }
  return (
    typeof value.currentRound === 'number' &&
    Number.isInteger(value.currentRound) &&
    typeof value.currentMatch === 'number' &&
    Number.isInteger(value.currentMatch) &&
    (value.turn === 0 || value.turn === 1) &&
    typeof value.phase === 'string' &&
    ['ready', 'playing', 'turnEnd', 'matchEnd', 'complete'].includes(value.phase) &&
    (value.snapshot === null || typeof value.snapshot === 'string')
  );
}
