import { ELAPSED_MAX_MS, MOVES_MAX, isWon } from '../game.ts';
import { parseBoardCode } from '../deck.ts';
import { hasExactKeys, isJsonObject, isNonnegativeSafeInteger } from '../saved-format.ts';
import { TournamentPhase } from './model.ts';
import { normalizePlayerName, playerNamesError } from './names.ts';
import { readTournamentGame } from './format-game.ts';
import { currentMatchIndex, tournamentRound } from './pairing.ts';
import type { TournamentMatch, TournamentResult, TournamentState } from './model.ts';

function readResult(value: unknown, size: number): TournamentResult | null {
  if (
    !isJsonObject(value) ||
    !hasExactKeys(value, ['elapsedMs', 'moves']) ||
    !isNonnegativeSafeInteger(value.moves) ||
    value.moves < size ** 2 / 2 ||
    value.moves > MOVES_MAX ||
    typeof value.elapsedMs !== 'number' ||
    !Number.isFinite(value.elapsedMs) ||
    value.elapsedMs < 0 ||
    value.elapsedMs > ELAPSED_MAX_MS
  )
    return null;
  return { moves: value.moves, elapsedMs: value.elapsedMs };
}

function readMatches(value: unknown[], count: number): TournamentMatch[] | null {
  if (value.length !== count - 1) return null;
  const matches: TournamentMatch[] = [];
  let unfinished = false;
  for (const [index, match] of value.entries()) {
    const size = tournamentRound(count, index).size;
    if (
      !isJsonObject(match) ||
      !hasExactKeys(match, ['boardCode', 'results']) ||
      typeof match.boardCode !== 'string' ||
      parseBoardCode(match.boardCode)?.size !== size ||
      !Array.isArray(match.results) ||
      match.results.length > 2 ||
      (unfinished && match.results.length)
    )
      return null;
    const results: TournamentResult[] = [];
    for (const value of match.results) {
      const result = readResult(value, size);
      if (!result) return null;
      results.push(result);
    }
    unfinished ||= results.length < 2;
    matches.push({ boardCode: match.boardCode, results });
  }
  return new Set(matches.map((match) => match.boardCode)).size === matches.length ? matches : null;
}

export function readTournamentState(value: unknown): TournamentState | null {
  if (
    !isJsonObject(value) ||
    !hasExactKeys(value, ['game', 'matches', 'names', 'phase']) ||
    !Array.isArray(value.names) ||
    !value.names.every((name): name is string => typeof name === 'string') ||
    (value.names.length !== 4 && value.names.length !== 8) ||
    !Array.isArray(value.matches)
  )
    return null;
  const names = value.names;
  if (value.phase === TournamentPhase.setup)
    return value.game === null && value.matches.length === 0
      ? { phase: TournamentPhase.setup, names, matches: [], game: null }
      : null;
  if (playerNamesError(names) || names.some((name) => name !== normalizePlayerName(name)))
    return null;
  const phase = Object.values(TournamentPhase).find((phase) => phase === value.phase);
  const matches = readMatches(value.matches, names.length);
  const game = readTournamentGame(value.game);
  if (!phase || !matches || !game) return null;
  const state: TournamentState = { phase, names, matches, game };
  const index = currentMatchIndex(state);
  const match = matches[index];
  const completed = matches.filter((match) => match.results.length === 2).length;
  const single = matches.some((match) => match.results.length === 1);
  if (!match || game.boardCode !== match.boardCode) return null;
  if (phase === TournamentPhase.complete) {
    if (completed !== matches.length) return null;
  } else if (phase === TournamentPhase.matchEnd) {
    if (completed === 0 || completed === matches.length || single) return null;
  } else if (phase === TournamentPhase.turnEnd) {
    if (!single) return null;
  } else if (completed === matches.length || isWon(game)) return null;
  if (
    phase === TournamentPhase.turnEnd ||
    phase === TournamentPhase.matchEnd ||
    phase === TournamentPhase.complete
  ) {
    const result = match.results.at(-1);
    if (
      !isWon(game) ||
      !result ||
      result.moves !== game.moves ||
      result.elapsedMs !== game.elapsedMs
    )
      return null;
  }
  return state;
}
