import { parseBoardCode } from '../deck.ts';
import { ELAPSED_MAX_MS, MOVES_MAX, isWon } from '../game.ts';
import { hasExactKeys, isJsonObject, isNonnegativeSafeInteger } from '../saved-format.ts';
import { nameProblem, normalizedNames, roundFor, TournamentPhase } from './rules.ts';
import type { GameState } from '../game.ts';
import type { TournamentMatch, TournamentResult, TournamentState } from './rules.ts';

function readMatch(value: unknown, size: number): TournamentMatch | null {
  if (
    !isJsonObject(value) ||
    !hasExactKeys(value, ['boardCode', 'results']) ||
    typeof value.boardCode !== 'string' ||
    parseBoardCode(value.boardCode)?.size !== size ||
    !Array.isArray(value.results) ||
    value.results.length > 2
  )
    return null;
  const results: TournamentResult[] = [];
  for (const result of value.results) {
    if (
      !isJsonObject(result) ||
      !hasExactKeys(result, ['elapsedMs', 'moves']) ||
      !isNonnegativeSafeInteger(result.moves) ||
      result.moves < (size * size) / 2 ||
      result.moves > MOVES_MAX ||
      typeof result.elapsedMs !== 'number' ||
      !Number.isFinite(result.elapsedMs) ||
      result.elapsedMs < 0 ||
      result.elapsedMs > ELAPSED_MAX_MS
    )
      return null;
    results.push({ moves: result.moves, elapsedMs: result.elapsedMs });
  }
  return { boardCode: value.boardCode, results };
}

export function readTournament(
  value: Record<string, unknown>,
  game: GameState | null,
): TournamentState | null {
  if (
    !Array.isArray(value.names) ||
    ![4, 8].includes(value.names.length) ||
    !value.names.every((name): name is string => typeof name === 'string') ||
    !Array.isArray(value.matches) ||
    !isNonnegativeSafeInteger(value.matchIndex)
  )
    return null;
  const names = value.names;
  const matchIndex = value.matchIndex;
  const phase = Object.values(TournamentPhase).find((phase) => phase === value.phase);
  if (!phase) return null;
  if (phase === TournamentPhase.setup) {
    return value.matches.length === 0 && value.matchIndex === 0 && game === null
      ? { names, matches: [], matchIndex: 0, phase, game: null }
      : null;
  }
  if (
    nameProblem(names) ||
    normalizedNames(names).some((name, i) => name !== names[i]) ||
    value.matches.length !== names.length - 1 ||
    value.matchIndex >= value.matches.length
  )
    return null;
  const matches: TournamentMatch[] = [];
  for (const [index, item] of value.matches.entries()) {
    const match = readMatch(item, roundFor(names.length, index).size);
    if (!match || matches.some((other) => other.boardCode === match.boardCode)) return null;
    matches.push(match);
  }
  const current = matches[value.matchIndex];
  if (
    !current ||
    matches.some((match, index) =>
      index < matchIndex
        ? match.results.length !== 2
        : index > matchIndex && match.results.length !== 0,
    )
  )
    return null;
  if (phase === TournamentPhase.complete) {
    if (value.matchIndex !== matches.length - 1 || current.results.length !== 2 || game)
      return null;
  } else if (phase === TournamentPhase.result) {
    if (
      current.results.length < 1 ||
      game ||
      (value.matchIndex === matches.length - 1 && current.results.length === 2)
    )
      return null;
  } else {
    if (current.results.length > 1) return null;
    if (phase === TournamentPhase.ready && game) return null;
    if (
      phase === TournamentPhase.playing &&
      (!game || isWon(game) || game.boardCode !== current.boardCode)
    )
      return null;
  }
  return { names, matches, matchIndex: value.matchIndex, phase, game };
}
