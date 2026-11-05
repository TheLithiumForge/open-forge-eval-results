import { parseBoardCode } from '../deck.ts';
import { ELAPSED_MAX_MS, MOVES_MAX } from '../game.ts';
import { hasExactKeys, isJsonObject } from '../saved-format.ts';
import { normalizePlayerName, playerNameErrors, tournamentRound } from './rules.ts';
import { TournamentPhase } from './types.ts';
import type { Tournament, TournamentMatch, TournamentResult, TournamentSetup } from './types.ts';

export function tournamentObject(value: unknown, keys: readonly string[]): Record<string, unknown> {
  if (!isJsonObject(value)) throw new Error('Invalid tournament.');
  const unknown = Object.keys(value).find((key) => !keys.includes(key));
  if (unknown) throw new Error(`Unknown field: ${unknown}.`);
  if (!hasExactKeys(value, keys)) throw new Error('Invalid tournament.');
  return value;
}

export function readTournamentSetup(value: unknown): TournamentSetup {
  const setup = tournamentObject(value, ['count', 'names']);
  if (
    (setup.count !== 4 && setup.count !== 8) ||
    !Array.isArray(setup.names) ||
    setup.names.length !== 8
  )
    throw new Error('Invalid tournament.');
  const names: string[] = [];
  for (const name of setup.names) {
    if (typeof name !== 'string') throw new Error('Invalid tournament.');
    names.push(name);
  }
  return { count: setup.count, names };
}

function readResult(value: unknown, size: number): TournamentResult {
  const result = tournamentObject(value, ['moves', 'elapsedMs']);
  if (
    typeof result.moves !== 'number' ||
    !Number.isInteger(result.moves) ||
    result.moves < size ** 2 / 2 ||
    result.moves > MOVES_MAX ||
    typeof result.elapsedMs !== 'number' ||
    !Number.isFinite(result.elapsedMs) ||
    result.elapsedMs < 0 ||
    result.elapsedMs > ELAPSED_MAX_MS
  )
    throw new Error('Invalid tournament.');
  return { moves: result.moves, elapsedMs: result.elapsedMs };
}

export function readTournament(value: unknown): Tournament {
  const item = tournamentObject(value, ['players', 'matches', 'matchIndex', 'turn', 'phase']);
  if (!Array.isArray(item.players) || (item.players.length !== 4 && item.players.length !== 8))
    throw new Error('Invalid tournament.');
  const players: string[] = [];
  for (const player of item.players) {
    if (typeof player !== 'string' || normalizePlayerName(player) !== player)
      throw new Error('Invalid tournament.');
    players.push(player);
  }
  if (playerNameErrors(players).some(Boolean)) throw new Error('Invalid tournament.');
  if (!Array.isArray(item.matches) || item.matches.length !== players.length - 1)
    throw new Error('Invalid tournament.');
  const matches: TournamentMatch[] = item.matches.map((value: unknown, index: number) => {
    const match = tournamentObject(value, ['boardCode', 'results']);
    const size = tournamentRound(players.length, index).size;
    if (
      typeof match.boardCode !== 'string' ||
      parseBoardCode(match.boardCode)?.size !== size ||
      !Array.isArray(match.results) ||
      match.results.length > 2
    )
      throw new Error('Invalid tournament.');
    return {
      boardCode: match.boardCode,
      results: match.results.map((result: unknown) => readResult(result, size)),
    };
  });
  if (
    new Set(matches.map((match) => match.boardCode)).size !== matches.length ||
    typeof item.matchIndex !== 'number' ||
    !Number.isInteger(item.matchIndex) ||
    item.matchIndex < 0 ||
    item.matchIndex >= matches.length ||
    (item.turn !== 0 && item.turn !== 1)
  )
    throw new Error('Invalid tournament.');
  const phase = item.phase;
  if (
    phase !== TournamentPhase.ready &&
    phase !== TournamentPhase.playing &&
    phase !== TournamentPhase.turnComplete &&
    phase !== TournamentPhase.matchComplete &&
    phase !== TournamentPhase.complete
  )
    throw new Error('Invalid tournament.');
  if (
    (phase === TournamentPhase.turnComplete && item.turn !== 0) ||
    (phase === TournamentPhase.matchComplete &&
      (item.turn !== 1 || item.matchIndex === matches.length - 1)) ||
    (phase === TournamentPhase.complete &&
      (item.turn !== 1 || item.matchIndex !== matches.length - 1))
  )
    throw new Error('Invalid tournament.');
  const currentResults =
    phase === TournamentPhase.ready || phase === TournamentPhase.playing
      ? item.turn
      : item.turn + 1;
  for (const [index, match] of matches.entries()) {
    const expected = index < item.matchIndex ? 2 : index === item.matchIndex ? currentResults : 0;
    if (match.results.length !== expected) throw new Error('Invalid tournament.');
  }
  return { players, matches, matchIndex: item.matchIndex, turn: item.turn, phase };
}
