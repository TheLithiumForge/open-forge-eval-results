import { parseBoardCode } from '../deck.ts';
import { ELAPSED_MAX_MS, MOVES_MAX } from '../game.ts';
import { hasExactKeys, isJsonObject, isNonnegativeSafeInteger } from '../saved-format.ts';
import { matchSizes, nameProblem, normalizeName, TournamentPhase } from './rules.ts';
import type { Match, Result, Tournament } from './rules.ts';

// Throw only inside the decoder boundary, so nested unknown fields retain their diagnostic.
export function exactObject(
  value: unknown,
  keys: readonly string[],
): Record<string, unknown> | null {
  if (!isJsonObject(value)) return null;
  const extra = Object.keys(value).find((key) => !keys.includes(key));
  if (extra !== undefined) throw new Error(`Unknown field: ${extra}.`);
  return hasExactKeys(value, keys) ? value : null;
}

function readResults(value: unknown, size: number): readonly Result[] | null {
  if (!Array.isArray(value) || value.length > 2) return null;
  const results: Result[] = [];
  for (const item of value) {
    const result = exactObject(item, ['elapsedMs', 'moves']);
    if (
      !result ||
      !isNonnegativeSafeInteger(result.moves) ||
      result.moves < size ** 2 / 2 ||
      result.moves > MOVES_MAX ||
      typeof result.elapsedMs !== 'number' ||
      !Number.isFinite(result.elapsedMs) ||
      result.elapsedMs < 0 ||
      result.elapsedMs > ELAPSED_MAX_MS
    )
      return null;
    results.push({ elapsedMs: result.elapsedMs, moves: result.moves });
  }
  return results;
}

export function readTournament(value: Record<string, unknown>): Tournament | null {
  const { players, matchIndex, phase } = value;
  if (
    !Array.isArray(players) ||
    (players.length !== 4 && players.length !== 8) ||
    !players.every((name): name is string => typeof name === 'string') ||
    nameProblem(players) ||
    players.some((name) => normalizeName(name) !== name) ||
    !isNonnegativeSafeInteger(matchIndex)
  )
    return null;
  if (!Object.values(TournamentPhase).some((item) => item === phase)) return null;
  const sizes = matchSizes(players.length);
  if (
    !Array.isArray(value.matches) ||
    value.matches.length !== sizes.length ||
    matchIndex >= sizes.length
  )
    return null;
  const matches: Match[] = [];
  const codes = new Set<string>();
  for (const [index, item] of value.matches.entries()) {
    const match = exactObject(item, ['boardCode', 'results']);
    const size = sizes[index];
    if (
      !match ||
      typeof match.boardCode !== 'string' ||
      !size ||
      parseBoardCode(match.boardCode)?.size !== size ||
      codes.has(match.boardCode)
    )
      return null;
    const results = readResults(match.results, size);
    if (
      !results ||
      (index < matchIndex && results.length !== 2) ||
      (index > matchIndex && results.length !== 0)
    )
      return null;
    codes.add(match.boardCode);
    matches.push({ boardCode: match.boardCode, results });
  }
  const count = matches[matchIndex]?.results.length;
  if (
    (phase === TournamentPhase.ready || phase === TournamentPhase.playing) &&
    count !== 0 &&
    count !== 1
  )
    return null;
  if (phase === TournamentPhase.turnOver && count !== 1) return null;
  if ((phase === TournamentPhase.matchOver || phase === TournamentPhase.complete) && count !== 2)
    return null;
  if (phase === TournamentPhase.complete && matchIndex !== sizes.length - 1) return null;
  if (phase === TournamentPhase.matchOver && matchIndex === sizes.length - 1) return null;
  // Narrow the externally supplied phase without casting unknown data.
  const acceptedPhase = Object.values(TournamentPhase).find((item) => item === phase);
  return acceptedPhase ? { players, matches, matchIndex, phase: acceptedPhase } : null;
}
