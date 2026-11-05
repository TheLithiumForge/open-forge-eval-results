import { decodeSnapshot } from '../snapshot.ts';
import { isJsonObject, isWithinBytes, parseJson } from '../saved-format.ts';
import {
  finishTurn,
  nameError,
  newTournament,
  normalizeName,
  roundSize,
  isValidCode,
  isValidResult,
} from './rules.ts';
import type { TournamentData, Phase, Result } from './rules.ts';

function isPhase(value: unknown): value is Phase {
  return (
    value === 'ready' ||
    value === 'playing' ||
    value === 'turn-ended' ||
    value === 'match-ended' ||
    value === 'champion'
  );
}
function keys(value: Record<string, unknown>, allowed: string[]): string | null {
  const extra = Object.keys(value).find((key) => !allowed.includes(key));
  if (extra) return `Unknown field: ${extra}.`;
  return allowed.every((key) => Object.hasOwn(value, key)) ? null : 'Invalid tournament.';
}
export function readTournament(value: unknown): {
  tournament: TournamentData | null;
  error: string;
} {
  const invalid = { tournament: null, error: 'Invalid tournament.' };
  if (!isJsonObject(value)) return invalid;
  let error = keys(value, ['names', 'matches', 'current', 'phase', 'snapshot']);
  if (error) return { tournament: null, error };
  const { names, matches, current, phase, snapshot } = value;
  if (
    !Array.isArray(names) ||
    ![4, 8].includes(names.length) ||
    names.some((name) => typeof name !== 'string' || normalizeName(name) !== name) ||
    nameError(names)
  )
    return invalid;
  if (
    !Array.isArray(matches) ||
    matches.length !== names.length - 1 ||
    !Number.isInteger(current) ||
    typeof current !== 'number' ||
    current < 0 ||
    current >= matches.length ||
    !isPhase(phase)
  )
    return invalid;
  const codes: string[] = [];
  const parsedMatches: Array<{
    players: unknown[];
    results: Array<Result | null>;
    winner: unknown;
  }> = [];
  for (let i = 0; i < matches.length; i++) {
    const match: unknown = matches[i];
    if (!isJsonObject(match)) return invalid;
    error = keys(match, ['code', 'players', 'results', 'winner']);
    if (error) return { tournament: null, error };
    if (
      !isValidCode(match.code, roundSize(names.length, i)) ||
      codes.includes(match.code) ||
      !Array.isArray(match.players) ||
      match.players.length !== 2 ||
      !Array.isArray(match.results) ||
      match.results.length !== 2
    )
      return invalid;
    codes.push(match.code);
    const results: Array<Result | null> = [];
    for (const result of match.results) {
      if (result !== null) {
        if (isJsonObject(result)) {
          error = keys(result, ['elapsedMs', 'moves']);
          if (error) return { tournament: null, error };
        }
        if (!isValidResult(result, roundSize(names.length, i))) return invalid;
        results.push(result);
      } else results.push(null);
    }
    parsedMatches.push({ players: match.players, results, winner: match.winner });
  }
  let expected = newTournament(names, codes);
  for (let i = 0; i <= current; i++) {
    const results = parsedMatches[i]!.results;
    if (i < current && (!results[0] || !results[1])) return invalid;
    if (results[1] && !results[0]) return invalid;
    expected = { ...expected, current: i };
    if (results[0]) expected = finishTurn(expected, results[0]);
    if (results[1]) expected = finishTurn(expected, results[1]);
  }
  for (let i = 0; i < matches.length; i++) {
    const actual = parsedMatches[i]!;
    const match = expected.matches[i]!;
    if (
      JSON.stringify(actual.players) !== JSON.stringify(match.players) ||
      actual.winner !== match.winner ||
      actual.results.some(
        (item, j) =>
          item?.moves !== match.results[j]?.moves ||
          item?.elapsedMs !== match.results[j]?.elapsedMs,
      )
    )
      return invalid;
  }
  const result = expected.matches[current]!.results;
  if (
    ((phase === 'ready' || phase === 'playing') && result[1]) ||
    (phase === 'turn-ended' && (!result[0] || result[1])) ||
    ((phase === 'match-ended' || phase === 'champion') && !result[1]) ||
    (phase === 'champion' && current !== matches.length - 1)
  )
    return invalid;
  if (phase === 'playing') {
    if (typeof snapshot !== 'string') return invalid;
    const game = decodeSnapshot(snapshot);
    if (!game || game.boardCode !== codes[current] || game.matched.length === game.deck.length)
      return invalid;
  } else if (snapshot !== null) return invalid;
  return {
    tournament: {
      ...expected,
      current,
      phase,
      snapshot,
    },
    error: '',
  };
}
function sorted(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sorted);
  if (isJsonObject(value))
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((key) => [key, sorted(value[key])]),
    );
  return value;
}
export function exportTournament(tournament: TournamentData | null): string {
  return JSON.stringify(
    sorted({ format: 'neon-pairs/tournament', version: 1, tournament }),
    null,
    2,
  );
}
export function importTournament(text: string): {
  tournament: TournamentData | null;
  error: string;
} {
  if (!isWithinBytes(text, 262144)) return { tournament: null, error: 'Invalid tournament.' };
  const value = parseJson(text);
  if (!isJsonObject(value)) return { tournament: null, error: 'Invalid tournament.' };
  const error = keys(value, ['format', 'version', 'tournament']);
  if (error) return { tournament: null, error };
  if (value.format !== 'neon-pairs/tournament' || value.version !== 1)
    return { tournament: null, error: 'Invalid tournament.' };
  return value.tournament === null
    ? { tournament: null, error: '' }
    : readTournament(value.tournament);
}
