import { ELAPSED_MAX_MS, MOVES_MAX } from '../game.ts';
import { hasExactKeys, isJsonObject, isNonnegativeSafeInteger } from '../saved-format.ts';
import {
  createTournament,
  nextTournamentTurn,
  recordTournamentResult,
  TournamentPhase,
} from './rules.ts';
import { nameError, normalizeName } from './names.ts';
import type { TournamentState, TurnResult } from './rules.ts';

function readResult(value: unknown, size: number): TurnResult | null {
  if (
    !isJsonObject(value) ||
    !hasExactKeys(value, ['moves', 'elapsedMs']) ||
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

export function alphabeticalJson(value: unknown): string {
  function sorted(item: unknown): unknown {
    if (Array.isArray(item)) return item.map(sorted);
    if (!isJsonObject(item)) return item;
    const result: Record<string, unknown> = {};
    for (const key of Object.keys(item).sort()) result[key] = sorted(item[key]);
    return result;
  }
  return JSON.stringify(sorted(value), null, 2);
}

export function readTournamentState(value: unknown): TournamentState | null {
  if (
    !isJsonObject(value) ||
    !hasExactKeys(value, ['players', 'matches', 'matchIndex', 'turn', 'phase']) ||
    !Array.isArray(value.players) ||
    !value.players.every((name): name is string => typeof name === 'string') ||
    (value.players.length !== 4 && value.players.length !== 8) ||
    nameError(value.players) ||
    value.players.some((name) => normalizeName(name) !== name) ||
    !Array.isArray(value.matches) ||
    value.matches.length !== value.players.length - 1 ||
    !isNonnegativeSafeInteger(value.matchIndex) ||
    (value.turn !== 0 && value.turn !== 1)
  )
    return null;
  const phase = value.phase;
  if (
    phase !== TournamentPhase.ready &&
    phase !== TournamentPhase.playing &&
    phase !== TournamentPhase.turnComplete &&
    phase !== TournamentPhase.matchComplete &&
    phase !== TournamentPhase.complete
  )
    return null;
  const codes: string[] = [];
  for (const match of value.matches) {
    if (!isJsonObject(match) || typeof match.boardCode !== 'string') return null;
    codes.push(match.boardCode);
  }
  let state = createTournament(value.players, codes);
  let gap = false;
  for (const [index, match] of value.matches.entries()) {
    const expected = state.matches[index];
    if (
      !expected ||
      !isJsonObject(match) ||
      !Array.isArray(match.results) ||
      match.results.length !== 2
    )
      return null;
    for (const result of match.results) {
      if (result === null) {
        gap = true;
        continue;
      }
      const accepted = readResult(result, expected.size);
      if (gap || !accepted) return null;
      state = nextTournamentTurn(state);
      if (state.phase !== TournamentPhase.ready) return null;
      state = recordTournamentResult({ ...state, phase: TournamentPhase.playing }, accepted);
    }
  }
  if (phase === TournamentPhase.ready || phase === TournamentPhase.playing)
    state = nextTournamentTurn(state);
  if (
    state.matchIndex !== value.matchIndex ||
    state.turn !== value.turn ||
    (state.phase !== phase &&
      !(state.phase === TournamentPhase.ready && phase === TournamentPhase.playing)) ||
    alphabeticalJson(state.matches) !== alphabeticalJson(value.matches)
  )
    return null;
  return { ...state, phase };
}
