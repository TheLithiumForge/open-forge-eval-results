import { parseBoardCode } from '../deck.ts';
import { ELAPSED_MAX_MS, isWon, MOVES_MAX } from '../game.ts';
import { hasExactKeys, isJsonObject, isNonnegativeSafeInteger } from '../saved-format.ts';
import { decodeSnapshot } from '../snapshot.ts';
import { createTournament, matchStage, TournamentPhase, validateNames } from './rules.ts';
import type { TournamentState, TournamentMatch, TurnResult } from './rules.ts';

function readResults(value: unknown, size: number): readonly TurnResult[] | null {
  if (!Array.isArray(value) || value.length > 2) return null;
  const results: TurnResult[] = [];
  for (const result of value) {
    if (
      !isJsonObject(result) ||
      !hasExactKeys(result, ['elapsedMs', 'moves']) ||
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

export function readTournamentState(value: unknown): TournamentState | null {
  if (
    !isJsonObject(value) ||
    !hasExactKeys(value, ['currentMatch', 'game', 'matches', 'phase', 'players']) ||
    !Array.isArray(value.players) ||
    (value.players.length !== 4 && value.players.length !== 8) ||
    !value.players.every((name: unknown): name is string => typeof name === 'string')
  )
    return null;
  const names = validateNames(value.players);
  if (
    !names.names ||
    !Array.isArray(value.matches) ||
    value.matches.length !== names.names.length - 1 ||
    !isNonnegativeSafeInteger(value.currentMatch) ||
    value.currentMatch >= value.matches.length
  )
    return null;
  const matches: TournamentMatch[] = [];
  for (const [index, match] of value.matches.entries()) {
    if (
      !isJsonObject(match) ||
      !hasExactKeys(match, ['boardCode', 'results']) ||
      typeof match.boardCode !== 'string' ||
      parseBoardCode(match.boardCode)?.size !== matchStage(names.names.length, index).size
    )
      return null;
    const results = readResults(match.results, matchStage(names.names.length, index).size);
    if (
      !results ||
      (index < value.currentMatch && results.length !== 2) ||
      (index > value.currentMatch && results.length !== 0)
    )
      return null;
    matches.push({ boardCode: match.boardCode, results });
  }
  if (new Set(matches.map((match) => match.boardCode)).size !== matches.length) return null;
  const phase = Object.values(TournamentPhase).find((entry) => entry === value.phase);
  const match = matches[value.currentMatch];
  if (!phase || !match) return null;
  const resultCount = match.results.length;
  if ((phase === TournamentPhase.ready || phase === TournamentPhase.playing) && resultCount > 1)
    return null;
  if (phase === TournamentPhase.turnResult && resultCount !== 1) return null;
  if (
    (phase === TournamentPhase.matchResult || phase === TournamentPhase.complete) &&
    resultCount !== 2
  )
    return null;
  if (
    (phase === TournamentPhase.complete) !==
    (value.currentMatch === matches.length - 1 && resultCount === 2)
  )
    return null;
  const game = value.game === null ? null : decodeSnapshot(JSON.stringify(value.game));
  if (value.game !== null && !game) return null;
  if (game && game.boardCode !== match.boardCode) return null;
  if (phase === TournamentPhase.ready) {
    if (game && isWon(game)) return null;
  } else if (!game || (phase === TournamentPhase.playing ? isWon(game) : !isWon(game))) return null;
  if (game && isWon(game)) {
    const result = match.results.at(-1);
    if (!result || result.moves !== game.moves || Math.floor(result.elapsedMs) !== game.elapsedMs)
      return null;
  }
  return {
    ...createTournament(names.names, []),
    currentMatch: value.currentMatch,
    matches,
    phase,
    game,
  };
}
