import { parseBoardCode } from '../deck.ts';
import { createGame, ELAPSED_MAX_MS, isWon, MOVES_MAX } from '../game.ts';
import { decodeSnapshot } from '../snapshot.ts';
import { hasExactKeys, isJsonObject, isNonnegativeSafeInteger } from '../saved-format.ts';
import {
  advanceTournament,
  createTournament,
  normalizePlayerName,
  playerNamesError,
  recordTournamentTurn,
  tournamentRound,
} from './rules.ts';
import { TournamentPhase } from './model.ts';
import type { TournamentSetup, TournamentState } from './model.ts';

export function readTournamentSetup(value: unknown): TournamentSetup | null {
  if (!isJsonObject(value) || !hasExactKeys(value, ['count', 'names'])) return null;
  if (
    (value.count !== 4 && value.count !== 8) ||
    !Array.isArray(value.names) ||
    value.names.length !== value.count
  )
    return null;
  const names: string[] = [];
  for (const name of value.names) {
    if (typeof name !== 'string' || name !== normalizePlayerName(name)) return null;
    names.push(name);
  }
  return { count: value.count, names };
}

export function readTournamentState(value: unknown): TournamentState | null {
  if (
    !isJsonObject(value) ||
    !hasExactKeys(value, ['names', 'matches', 'currentMatch', 'phase', 'game'])
  )
    return null;
  if (!Array.isArray(value.names) || (value.names.length !== 4 && value.names.length !== 8))
    return null;
  const setup = readTournamentSetup({ count: value.names.length, names: value.names });
  if (!setup || playerNamesError(setup.names)) return null;
  if (!Array.isArray(value.matches) || value.matches.length !== setup.count - 1) return null;
  if (!isNonnegativeSafeInteger(value.currentMatch) || value.currentMatch >= value.matches.length)
    return null;
  let expected = createTournament(setup.names, 1);
  const codes: string[] = [];
  for (const [index, match] of value.matches.entries()) {
    if (!isJsonObject(match) || !hasExactKeys(match, ['boardCode', 'players', 'results', 'winner']))
      return null;
    if (
      typeof match.boardCode !== 'string' ||
      parseBoardCode(match.boardCode)?.size !== tournamentRound(setup.count, index).size
    )
      return null;
    codes.push(match.boardCode);
  }
  if (new Set(codes).size !== codes.length) return null;
  expected = {
    ...expected,
    matches: expected.matches.map((match, index) => ({ ...match, boardCode: codes[index]! })),
  };
  for (const [index, match] of value.matches.entries()) {
    if (!isJsonObject(match) || !Array.isArray(match.results)) return null;
    if (index > value.currentMatch && match.results.length !== 0) return null;
    if (index < value.currentMatch && match.results.length !== 2) return null;
    if (match.results.length > 2) return null;
    for (const result of match.results) {
      if (!isJsonObject(result) || !hasExactKeys(result, ['moves', 'elapsedMs'])) return null;
      if (
        !isNonnegativeSafeInteger(result.moves) ||
        result.moves < tournamentRound(setup.count, index).size ** 2 / 2 ||
        result.moves > MOVES_MAX
      )
        return null;
      if (
        typeof result.elapsedMs !== 'number' ||
        !Number.isFinite(result.elapsedMs) ||
        result.elapsedMs < 0 ||
        result.elapsedMs > ELAPSED_MAX_MS
      )
        return null;
      expected = recordTournamentTurn(expected, {
        moves: result.moves,
        elapsedMs: result.elapsedMs,
      });
    }
    if (index < value.currentMatch) expected = advanceTournament(expected);
  }
  for (const [index, match] of value.matches.entries()) {
    if (
      !isJsonObject(match) ||
      JSON.stringify(match.players) !== JSON.stringify(expected.matches[index]!.players) ||
      match.winner !== expected.matches[index]!.winner
    )
      return null;
  }
  const game = decodeSnapshot(JSON.stringify(value.game));
  if (!game || game.boardCode !== codes[value.currentMatch]) return null;
  const phase = value.phase;
  const current = expected.matches[value.currentMatch]!;
  const resultCount = current.results.length;
  if (phase === TournamentPhase.ready || phase === TournamentPhase.playing) {
    if (resultCount > 1 || isWon(game)) return null;
    if (
      phase === TournamentPhase.ready &&
      JSON.stringify(game) !== JSON.stringify(createGame(game.boardCode))
    )
      return null;
  } else if (
    phase === TournamentPhase.turnComplete ||
    phase === TournamentPhase.matchComplete ||
    phase === TournamentPhase.complete
  ) {
    if (phase !== expected.phase || !isWon(game)) return null;
    const result = current.results.at(-1);
    if (!result || result.moves !== game.moves || Math.floor(result.elapsedMs) !== game.elapsedMs)
      return null;
  } else return null;
  return { ...expected, phase, game };
}
