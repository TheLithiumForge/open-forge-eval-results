import { decodeSnapshot } from '../snapshot.ts';
import { isWon } from '../game.ts';
import {
  createTournament,
  normalizeNames,
  recordScore,
  roundSize,
  isValidCode,
  isValidScore,
} from './rules.ts';
import type { TournamentData } from './rules.ts';

function object(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}
function extra(value: Record<string, unknown>, keys: string[]): string | null {
  return Object.keys(value).find((key) => !keys.includes(key)) ?? null;
}
function stable(_key: string, value: unknown): unknown {
  if (!object(value)) return value;
  return Object.fromEntries(Object.entries(value).sort(([a], [b]) => a.localeCompare(b)));
}
export function exportTournament(t: TournamentData): string {
  return JSON.stringify({ format: 'neon-pairs/tournament', version: 1, ...t }, stable, 2);
}
export function isEmptyTournament(text: string): boolean {
  try {
    const value: unknown = JSON.parse(text);
    return (
      object(value) &&
      Object.keys(value).sort().join(',') === 'format,tournament,version' &&
      value.format === 'neon-pairs/tournament' &&
      value.version === 1 &&
      value.tournament === null
    );
  } catch {
    return false;
  }
}
export function readTournament(text: string): { data: TournamentData | null; error: string } {
  const invalid = { data: null, error: 'Invalid tournament.' };
  if (new TextEncoder().encode(text).length > 65536) return invalid;
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return invalid;
  }
  if (!object(raw)) return invalid;
  let unknown = extra(raw, [
    'format',
    'version',
    'players',
    'matches',
    'index',
    'phase',
    'snapshot',
  ]);
  if (unknown) return { data: null, error: `Unknown field: ${unknown}.` };
  if (
    raw.format !== 'neon-pairs/tournament' ||
    raw.version !== 1 ||
    !Array.isArray(raw.players) ||
    ![4, 8].includes(raw.players.length) ||
    !raw.players.every((p) => typeof p === 'string')
  )
    return invalid;
  const players = raw.players.filter((p): p is string => typeof p === 'string');
  const names = normalizeNames(players);
  if (names.error || names.names.some((n, i) => n !== players[i])) return invalid;
  if (
    !Array.isArray(raw.matches) ||
    raw.matches.length !== names.names.length - 1 ||
    typeof raw.index !== 'number' ||
    !Number.isInteger(raw.index) ||
    raw.index < 0 ||
    raw.index >= raw.matches.length
  )
    return invalid;
  const codes: string[] = [];
  for (let i = 0; i < raw.matches.length; i++) {
    const m: unknown = raw.matches[i];
    if (!object(m)) return invalid;
    unknown = extra(m, ['boardCode', 'players', 'scores', 'winner']);
    if (unknown) return { data: null, error: `Unknown field: ${unknown}.` };
    if (
      !isValidCode(m.boardCode, roundSize(names.names.length, i)) ||
      !Array.isArray(m.players) ||
      m.players.length !== 2 ||
      !Array.isArray(m.scores) ||
      m.scores.length !== 2
    )
      return invalid;
    codes.push(m.boardCode);
    for (const score of m.scores) {
      if (object(score)) {
        unknown = extra(score, ['moves', 'elapsedMs']);
        if (unknown) return { data: null, error: `Unknown field: ${unknown}.` };
      }
      if (score !== null && !isValidScore(score, roundSize(names.names.length, i))) return invalid;
    }
  }
  if (new Set(codes).size !== codes.length) return invalid;
  const phase = raw.phase;
  if (
    phase !== 'ready' &&
    phase !== 'playing' &&
    phase !== 'turnDone' &&
    phase !== 'matchDone' &&
    phase !== 'complete'
  )
    return invalid;
  const index = raw.index;
  let expected = createTournament(names.names, codes);
  for (let i = 0; i <= index; i++) {
    const source: unknown = raw.matches[i];
    if (!object(source) || !Array.isArray(source.scores)) return invalid;
    const required =
      i < index
        ? 2
        : phase === 'complete' || phase === 'matchDone'
          ? 2
          : phase === 'turnDone'
            ? 1
            : source.scores[0] !== null
              ? 1
              : 0;
    for (let n = 0; n < required; n++) {
      const score = source.scores[n];
      if (!isValidScore(score, roundSize(names.names.length, i))) return invalid;
      expected = recordScore({ ...expected, index: i }, score);
    }
  }
  if (
    (phase === 'complete' && raw.index !== raw.matches.length - 1) ||
    (phase === 'matchDone' && raw.index === raw.matches.length - 1)
  )
    return invalid;
  if (JSON.stringify(expected.matches, stable) !== JSON.stringify(raw.matches, stable))
    return invalid;
  if (raw.snapshot !== null && typeof raw.snapshot !== 'string') return invalid;
  if (raw.snapshot !== null) {
    if (phase !== 'playing') return invalid;
    const game = decodeSnapshot(raw.snapshot);
    if (!game || isWon(game) || game.boardCode !== codes[index]) return invalid;
  }
  return { data: { ...expected, index: index, phase, snapshot: raw.snapshot }, error: '' };
}
