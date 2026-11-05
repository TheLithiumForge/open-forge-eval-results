import { parseBoardCode } from '../deck.ts';
import { ELAPSED_MAX_MS, MOVES_MAX } from '../game.ts';
import { hasExactKeys, isJsonObject, isNonnegativeSafeInteger } from '../saved-format.ts';
import { nameErrors, normalizeName } from './names.ts';
import { TournamentPhase, roundForMatch } from './rules.ts';
import type { TournamentMatch, TournamentScore, TournamentState } from './rules.ts';

const TOURNAMENT_KEYS = ['currentMatch', 'matches', 'phase', 'players'];
const MATCH_KEYS = ['boardCode', 'results'];
const SCORE_KEYS = ['elapsedMs', 'moves'];

function readScore(value: unknown, size: number): TournamentScore | null {
  if (!isJsonObject(value) || !hasExactKeys(value, SCORE_KEYS)) return null;
  if (
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

export function readTournament(value: unknown): TournamentState | null {
  if (
    !isJsonObject(value) ||
    !hasExactKeys(value, TOURNAMENT_KEYS) ||
    !Array.isArray(value.players) ||
    (value.players.length !== 4 && value.players.length !== 8)
  )
    return null;
  const players: string[] = [];
  for (const name of value.players) {
    if (typeof name !== 'string' || name !== normalizeName(name)) return null;
    players.push(name);
  }
  if (
    nameErrors(players).some(Boolean) ||
    !Array.isArray(value.matches) ||
    value.matches.length !== players.length - 1 ||
    !isNonnegativeSafeInteger(value.currentMatch) ||
    value.currentMatch >= value.matches.length
  )
    return null;
  const phase = Object.values(TournamentPhase).find((item) => item === value.phase);
  if (!phase) return null;
  const matches: TournamentMatch[] = [];
  const codes = new Set<string>();
  for (const [index, match] of value.matches.entries()) {
    if (
      !isJsonObject(match) ||
      !hasExactKeys(match, MATCH_KEYS) ||
      typeof match.boardCode !== 'string' ||
      codes.has(match.boardCode) ||
      !Array.isArray(match.results) ||
      match.results.length > 2
    )
      return null;
    const size = roundForMatch(players.length, index).size;
    if (parseBoardCode(match.boardCode)?.size !== size) return null;
    const results: TournamentScore[] = [];
    for (const result of match.results) {
      const score = readScore(result, size);
      if (!score) return null;
      results.push(score);
    }
    const expected = index < value.currentMatch ? 2 : index > value.currentMatch ? 0 : null;
    if (expected !== null && results.length !== expected) return null;
    matches.push({ boardCode: match.boardCode, results });
    codes.add(match.boardCode);
  }
  const length = matches[value.currentMatch]?.results.length;
  const final = value.currentMatch === matches.length - 1;
  if (
    (phase === TournamentPhase.ready || phase === TournamentPhase.playing) &&
    length !== 0 &&
    length !== 1
  )
    return null;
  if (phase === TournamentPhase.turnFinished && length !== 1) return null;
  if (phase === TournamentPhase.matchFinished && (length !== 2 || final)) return null;
  if (phase === TournamentPhase.completed && (length !== 2 || !final)) return null;
  return { players, matches, currentMatch: value.currentMatch, phase };
}

function unknownKey(value: unknown, keys: readonly string[]): string | null {
  return isJsonObject(value)
    ? (Object.keys(value).find((key) => !keys.includes(key)) ?? null)
    : null;
}

export function unknownTournamentField(value: unknown): string | null {
  const root = unknownKey(value, TOURNAMENT_KEYS);
  if (root !== null || !isJsonObject(value) || !Array.isArray(value.matches)) return root;
  for (const match of value.matches) {
    const key = unknownKey(match, MATCH_KEYS);
    if (key !== null) return key;
    if (!isJsonObject(match) || !Array.isArray(match.results)) continue;
    for (const score of match.results) {
      const field = unknownKey(score, SCORE_KEYS);
      if (field !== null) return field;
    }
  }
  return null;
}
