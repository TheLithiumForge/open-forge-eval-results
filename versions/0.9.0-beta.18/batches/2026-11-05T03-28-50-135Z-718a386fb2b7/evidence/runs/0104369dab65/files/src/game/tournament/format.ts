import { parseBoardCode } from '../deck.ts';
import { MOVES_MAX } from '../game.ts';
import { decodeProgress } from './progress.ts';
import { nameError, normalizeName, pairAt, roundSize, winner } from './rules.ts';
import type { Match, Result, TournamentState } from './rules.ts';

function object(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
function keys(value: Record<string, unknown>, expected: string[]): string | null {
  return Object.keys(value).find((key) => !expected.includes(key)) ?? null;
}
export function encodeTournament(
  tournament: TournamentState | null,
  drafts: string[],
  count: number,
): string {
  const sort = (_key: string, value: unknown): unknown =>
    object(value)
      ? Object.fromEntries(Object.entries(value).sort(([a], [b]) => a.localeCompare(b)))
      : value;
  return JSON.stringify(
    { format: 'neon-pairs/tournament', version: 1, tournament, drafts, count },
    sort,
    2,
  );
}
export function decodeTournament(
  text: string,
): { tournament: TournamentState | null; drafts: string[]; count: number } | string {
  try {
    if (new TextEncoder().encode(text).length > 65536) return 'Invalid tournament.';
    const value: unknown = JSON.parse(text);
    if (!object(value)) return 'Invalid tournament.';
    let extra = keys(value, ['format', 'version', 'tournament', 'drafts', 'count']);
    if (extra) return `Unknown field: ${extra}.`;
    if (
      value.format !== 'neon-pairs/tournament' ||
      value.version !== 1 ||
      (value.count !== 4 && value.count !== 8) ||
      !Array.isArray(value.drafts) ||
      value.drafts.length !== 8 ||
      value.drafts.some((x: unknown) => typeof x !== 'string' || x.length > 1000)
    )
      return 'Invalid tournament.';
    const drafts: string[] = [];
    for (const draft of value.drafts) {
      if (typeof draft !== 'string') return 'Invalid tournament.';
      drafts.push(draft);
    }
    if (value.tournament === null) return { tournament: null, drafts, count: value.count };
    const t = value.tournament;
    if (!object(t)) return 'Invalid tournament.';
    extra = keys(t, ['names', 'matches', 'phase', 'snapshot']);
    if (extra) return `Unknown field: ${extra}.`;
    if (
      !Array.isArray(t.names) ||
      (t.names.length !== 4 && t.names.length !== 8) ||
      !t.names.every(
        (x: unknown): x is string => typeof x === 'string' && normalizeName(x) === x,
      ) ||
      nameError(t.names) ||
      !Array.isArray(t.matches) ||
      t.matches.length < 1 ||
      t.matches.length >= t.names.length ||
      (t.phase !== 'ready' &&
        t.phase !== 'playing' &&
        t.phase !== 'turnDone' &&
        t.phase !== 'matchDone' &&
        t.phase !== 'complete')
    )
      return 'Invalid tournament.';
    const names = t.names;
    const matches: Match[] = [];
    for (const raw of t.matches) {
      if (!object(raw)) return 'Invalid tournament.';
      extra = keys(raw, ['players', 'code', 'results', 'winner']);
      if (extra) return `Unknown field: ${extra}.`;
      const index = matches.length;
      if (
        matches.some((m) => m.winner === null) ||
        !Array.isArray(raw.players) ||
        raw.players.length !== 2 ||
        !raw.players.every((p, i) => p === pairAt(names, matches)[i]) ||
        typeof raw.code !== 'string' ||
        parseBoardCode(raw.code)?.size !== roundSize(names.length, index) ||
        matches.some((m) => m.code === raw.code) ||
        !Array.isArray(raw.results) ||
        raw.results.length !== 2
      )
        return 'Invalid tournament.';
      const results: (Result | null)[] = [];
      for (const result of raw.results) {
        if (result === null) {
          results.push(null);
          continue;
        }
        if (!object(result)) return 'Invalid tournament.';
        extra = keys(result, ['moves', 'elapsedMs']);
        if (extra) return `Unknown field: ${extra}.`;
        if (
          typeof result.moves !== 'number' ||
          !Number.isSafeInteger(result.moves) ||
          result.moves < roundSize(names.length, index) ** 2 / 2 ||
          result.moves > MOVES_MAX ||
          typeof result.elapsedMs !== 'number' ||
          !Number.isFinite(result.elapsedMs) ||
          result.elapsedMs < 0 ||
          result.elapsedMs > 359999999
        )
          return 'Invalid tournament.';
        results.push({ moves: result.moves, elapsedMs: result.elapsedMs });
      }
      if ((!results[0] && results[1]) || (raw.winner !== null && typeof raw.winner !== 'number'))
        return 'Invalid tournament.';
      const match: Match = {
        players: pairAt(names, matches),
        code: raw.code,
        results: [results[0] ?? null, results[1] ?? null],
        winner: raw.winner,
      };
      if ((results[1] ? winner(match) : null) !== raw.winner) return 'Invalid tournament.';
      matches.push(match);
    }
    const last = matches.at(-1)!;
    const phase = t.phase;
    if (
      (phase === 'complete') !== (last.winner !== null && matches.length === names.length - 1) ||
      (phase === 'matchDone' && (last.winner === null || matches.length === names.length - 1)) ||
      (phase === 'turnDone' && (!last.results[0] || last.results[1])) ||
      (['ready', 'playing'].includes(phase) && last.winner !== null) ||
      (phase === 'playing' && typeof t.snapshot !== 'string') ||
      (phase !== 'playing' && t.snapshot !== null)
    )
      return 'Invalid tournament.';
    if (phase === 'playing') {
      if (typeof t.snapshot !== 'string') return 'Invalid tournament.';
      const game = decodeProgress(t.snapshot);
      if (!game || game.boardCode !== last.code || game.matched.length === game.deck.length)
        return 'Invalid tournament.';
    }
    return {
      tournament: {
        names,
        matches,
        phase,
        snapshot: typeof t.snapshot === 'string' ? t.snapshot : null,
      },
      drafts,
      count: value.count,
    };
  } catch {
    return 'Invalid tournament.';
  }
}
