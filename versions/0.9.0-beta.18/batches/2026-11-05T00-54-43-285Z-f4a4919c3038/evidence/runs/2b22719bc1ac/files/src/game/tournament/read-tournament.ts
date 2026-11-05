import { ELAPSED_MAX_MS, MOVES_MAX } from '../game.ts';
import { hasExactKeys, isJsonObject, isNonnegativeSafeInteger } from '../saved-format.ts';
import { nameError, normalizeName } from './names.ts';
import {
  createTournament,
  finishTurn,
  nextMatch,
  nextTurn,
  startTurn,
  TournamentPhase,
} from './rules.ts';
import type { Result, TournamentState } from './rules.ts';

export function requireShape(value: unknown, keys: readonly string[]): Record<string, unknown> {
  if (!isJsonObject(value)) throw new Error('Invalid tournament.');
  const unknown = Object.keys(value).find((key) => !keys.includes(key));
  if (unknown !== undefined) throw new Error(`Unknown field: ${unknown}.`);
  if (!hasExactKeys(value, keys)) throw new Error('Invalid tournament.');
  return value;
}

export function readNames(value: unknown): string[] {
  if (!Array.isArray(value) || (value.length !== 4 && value.length !== 8))
    throw new Error('Invalid tournament.');
  const names: string[] = [];
  for (const entry of value) {
    if (typeof entry !== 'string' || entry.length > 1024) throw new Error('Invalid tournament.');
    names.push(entry);
  }
  return names;
}

function readResult(value: unknown, size: number): Result {
  const result = requireShape(value, ['elapsedMs', 'moves']);
  if (
    !isNonnegativeSafeInteger(result.moves) ||
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

export function readTournament(value: unknown): TournamentState {
  const data = requireShape(value, ['matchIndex', 'matches', 'phase', 'players']);
  const names = readNames(data.players);
  if (
    nameError(names) ||
    names.some((name) => name !== normalizeName(name)) ||
    !Array.isArray(data.matches) ||
    data.matches.length !== names.length - 1 ||
    !isNonnegativeSafeInteger(data.matchIndex) ||
    data.matchIndex >= data.matches.length
  )
    throw new Error('Invalid tournament.');
  const matches = data.matches.map((match: unknown) =>
    requireShape(match, ['boardCode', 'players', 'results', 'winner']),
  );
  const codes: string[] = [];
  for (const match of matches) {
    if (typeof match.boardCode !== 'string') throw new Error('Invalid tournament.');
    codes.push(match.boardCode);
  }
  let state = createTournament(names, codes);
  for (let i = 0; i < matches.length; i += 1) {
    const match = matches[i];
    const expected = state.matches[i];
    if (!match || !expected || !Array.isArray(match.results) || match.results.length > 2)
      throw new Error('Invalid tournament.');
    for (const raw of match.results) {
      const result = readResult(raw, Number(expected.boardCode.split('-')[1]));
      if (state.matchIndex !== i || state.phase !== TournamentPhase.ready)
        throw new Error('Invalid tournament.');
      state = finishTurn(startTurn(state), result);
      if (
        state.phase === TournamentPhase.turnDone &&
        (match.results.length === 2 ||
          data.matchIndex > i ||
          (data.matchIndex === i &&
            (data.phase === TournamentPhase.ready || data.phase === TournamentPhase.playing)))
      )
        state = nextTurn(state);
      if (state.phase === TournamentPhase.matchDone && data.matchIndex > i)
        state = nextMatch(state);
    }
    const actual = state.matches[i];
    if (
      !actual ||
      JSON.stringify(match.players) !== JSON.stringify(actual.players) ||
      match.winner !== actual.winner
    )
      throw new Error('Invalid tournament.');
  }
  if (data.phase === TournamentPhase.playing) state = startTurn(state);
  if (state.phase !== data.phase || state.matchIndex !== data.matchIndex)
    throw new Error('Invalid tournament.');
  return state;
}
