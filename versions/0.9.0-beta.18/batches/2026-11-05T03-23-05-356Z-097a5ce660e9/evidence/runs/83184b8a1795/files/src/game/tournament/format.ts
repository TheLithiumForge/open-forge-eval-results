import { parseBoardCode } from '../deck.ts';
import { decodeSnapshot } from '../snapshot.ts';
import { isWon } from '../game.ts';
import {
  namesError,
  nextPlayers,
  normalizeName,
  roundSize,
  isValidResult,
  winner,
} from './model.ts';
import type { Result, TournamentState } from './model.ts';

interface Exchange {
  tournament: TournamentState | null;
  snapshot: string | null;
}
const object = (v: unknown): v is Record<string, unknown> =>
  !!v && typeof v === 'object' && !Array.isArray(v);
function keys(v: Record<string, unknown>, allowed: string[]): string | null {
  return Object.keys(v).find((key) => !allowed.includes(key)) ?? null;
}
export function encodeExchange(data: Exchange): string {
  const tournament = data.tournament && {
    matches: data.tournament.matches.map((m) => ({
      code: m.code,
      players: m.players,
      results: m.results.map((r) => ({ elapsedMs: r.elapsedMs, moves: r.moves })),
    })),
    names: data.tournament.names,
  };
  return JSON.stringify(
    { format: 'neon-pairs/tournament', snapshot: data.snapshot, tournament, version: 1 },
    null,
    2,
  );
}
export function decodeExchange(text: string): { data?: Exchange; error: string } {
  const fail = (error = 'Invalid tournament.') => ({ error });
  if (new TextEncoder().encode(text).length > 65536) return fail();
  let v: unknown;
  try {
    v = JSON.parse(text);
  } catch {
    return fail();
  }
  if (!object(v)) return fail();
  let extra = keys(v, ['format', 'snapshot', 'tournament', 'version']);
  if (extra) return fail(`Unknown field: ${extra}.`);
  if (
    Object.keys(v).length !== 4 ||
    v.format !== 'neon-pairs/tournament' ||
    v.version !== 1 ||
    !(v.snapshot === null || typeof v.snapshot === 'string')
  )
    return fail();
  if (v.tournament === null)
    return v.snapshot === null ? { data: { tournament: null, snapshot: null }, error: '' } : fail();
  if (!object(v.tournament)) return fail();
  extra = keys(v.tournament, ['matches', 'names']);
  if (extra) return fail(`Unknown field: ${extra}.`);
  const { names, matches } = v.tournament;
  if (
    Object.keys(v.tournament).length !== 2 ||
    !Array.isArray(names) ||
    ![4, 8].includes(names.length) ||
    !names.every((n) => typeof n === 'string' && n === normalizeName(n)) ||
    namesError(names) ||
    !Array.isArray(matches) ||
    matches.length < 1 ||
    matches.length > names.length - 1
  )
    return fail();
  const tournament: TournamentState = { names, matches: [] };
  for (const item of matches) {
    if (!object(item)) return fail();
    extra = keys(item, ['code', 'players', 'results']);
    if (extra) return fail(`Unknown field: ${extra}.`);
    const players = nextPlayers(tournament),
      parsed = typeof item.code === 'string' ? parseBoardCode(item.code) : null;
    if (
      Object.keys(item).length !== 3 ||
      !players ||
      !Array.isArray(item.players) ||
      item.players.length !== 2 ||
      item.players[0] !== players[0] ||
      item.players[1] !== players[1] ||
      !parsed ||
      parsed.size !== roundSize(names.length, tournament.matches.length) ||
      tournament.matches.some((m) => m.code === item.code) ||
      !Array.isArray(item.results) ||
      item.results.length > 2
    )
      return fail();
    const results: Result[] = [];
    for (const result of item.results) {
      if (object(result)) {
        extra = keys(result, ['elapsedMs', 'moves']);
        if (extra) return fail(`Unknown field: ${extra}.`);
      }
      if (!isValidResult(result, parsed.size)) return fail();
      results.push(result);
    }
    const previous = tournament.matches.at(-1);
    if (previous && winner(previous) === null) return fail();
    if (typeof item.code !== 'string') return fail();
    tournament.matches.push({ code: item.code, players, results });
  }
  const last = tournament.matches.at(-1);
  if (v.snapshot !== null) {
    const game = decodeSnapshot(v.snapshot);
    if (!last || last.results.length === 2 || !game || isWon(game) || game.boardCode !== last.code)
      return fail();
  }
  return { data: { tournament, snapshot: v.snapshot }, error: '' };
}
