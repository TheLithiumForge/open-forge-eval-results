import { parseBoardCode } from '../deck.ts';
import { isWon } from '../game.ts';
import { decodeSnapshot, encodeSnapshot } from '../snapshot.ts';
import { currentMatch, nameError, normalizeName } from './tournament.ts';
import { isTournamentShape } from './tournament-shape.ts';
import type { GameState } from '../game.ts';
import type { Tournament } from './tournament.ts';

function sizeFor(count: number): number {
  return count === 4 ? 4 : count === 2 ? 6 : 8;
}
// Export keys are recursively sorted so copies have a stable, readable representation.
function sorted(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sorted);
  if (value && typeof value === 'object')
    return Object.fromEntries(
      Object.entries(value)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([k, v]) => [k, sorted(v)]),
    );
  return value;
}
export function exportTournament(t: Tournament, game?: GameState): string {
  return JSON.stringify(
    sorted({
      format: 'neon-pairs/tournament',
      version: 1,
      tournament: { ...t, game: t.phase === 'playing' && game ? encodeSnapshot(game) : t.game },
    }),
    null,
    2,
  );
}
function keys(value: unknown, expected: string[]): value is Record<string, unknown> {
  return (
    !!value &&
    typeof value === 'object' &&
    !Array.isArray(value) &&
    Object.keys(value).length === expected.length &&
    expected.every((k) => Object.hasOwn(value, k))
  );
}
export function importTournament(text: string): { tournament: Tournament | null; error: string } {
  try {
    if (new TextEncoder().encode(text).length > 65536) throw Error();
    const root: unknown = JSON.parse(text);
    const check = (v: unknown, fields: string[]) => {
      if (v && typeof v === 'object' && !Array.isArray(v)) {
        const extra = Object.keys(v).find((k) => !fields.includes(k));
        if (extra) throw Error(`Unknown field: ${extra}.`);
      }
      if (!keys(v, fields)) throw Error();
    };
    check(root, ['format', 'version', 'tournament']);
    if (!keys(root, ['format', 'version', 'tournament'])) throw Error();
    const obj = root;
    if (obj.format !== 'neon-pairs/tournament' || obj.version !== 1) throw Error();
    check(obj.tournament, ['names', 'rounds', 'round', 'match', 'phase', 'game']);
    if (!isTournamentShape(obj.tournament)) throw Error();
    const t = obj.tournament;
    if (
      !Array.isArray(t.names) ||
      ![4, 8].includes(t.names.length) ||
      t.names.some((n) => typeof n !== 'string' || n !== normalizeName(n)) ||
      nameError(t.names)
    )
      throw Error();
    if (
      !Array.isArray(t.rounds) ||
      !Number.isInteger(t.round) ||
      t.round !== t.rounds.length - 1 ||
      !Number.isInteger(t.match) ||
      !['ready', 'playing', 'turnDone', 'matchDone', 'champion'].includes(t.phase)
    )
      throw Error();
    let expected: [number, number][] =
      t.names.length === 4
        ? [
            [0, 3],
            [1, 2],
          ]
        : [
            [0, 7],
            [3, 4],
            [2, 5],
            [1, 6],
          ];
    const used = new Set<string>();
    for (let r = 0; r < t.rounds.length; r++) {
      const round = t.rounds[r];
      if (!Array.isArray(round) || round.length !== expected.length || expected.length < 1)
        throw Error();
      for (let i = 0; i < round.length; i++) {
        const m = round[i]!;
        check(m, ['players', 'code', 'results', 'winner']);
        if (
          !Array.isArray(m.players) ||
          m.players.length !== 2 ||
          m.players[0] !== expected[i]![0] ||
          m.players[1] !== expected[i]![1] ||
          typeof m.code !== 'string' ||
          parseBoardCode(m.code)?.size !== sizeFor(round.length) ||
          used.has(m.code)
        )
          throw Error();
        used.add(m.code);
        if (!Array.isArray(m.results) || m.results.length !== 2) throw Error();
        for (const result of m.results)
          if (result !== null) {
            check(result, ['moves', 'elapsedMs']);
            if (
              !Number.isSafeInteger(result.moves) ||
              result.moves < sizeFor(round.length) ** 2 / 2 ||
              result.moves > 999999 ||
              !Number.isFinite(result.elapsedMs) ||
              result.elapsedMs < 0 ||
              result.elapsedMs > 359999999
            )
              throw Error();
          }
        if (!m.results[0] && m.results[1]) throw Error();
        const [a, b] = m.results;
        const winner =
          a && b
            ? a.moves !== b.moves
              ? m.players[a.moves < b.moves ? 0 : 1]
              : a.elapsedMs !== b.elapsedMs
                ? m.players[a.elapsedMs < b.elapsedMs ? 0 : 1]
                : Math.min(...m.players)
            : null;
        if (m.winner !== winner) throw Error();
        const position = r < t.round || i < t.match ? 'past' : i > t.match ? 'future' : 'current';
        if (
          (position === 'past' && winner === null) ||
          (position === 'future' && (a || b)) ||
          (position === 'current' &&
            ((t.phase === 'ready' && b) ||
              (t.phase === 'playing' && b) ||
              (t.phase === 'turnDone' && (!a || b)) ||
              (['matchDone', 'champion'].includes(t.phase) && winner === null)))
        )
          throw Error();
      }
      if (r < t.round) {
        if (round.length < 2) throw Error();
        const winners = round.map((m) => m.winner!);
        expected = [];
        for (let i = 0; i < winners.length; i += 2) expected.push([winners[i]!, winners[i + 1]!]);
      }
    }
    const round = t.rounds[t.round];
    if (
      !round ||
      t.match < 0 ||
      t.match >= round.length ||
      (t.phase === 'champion') !== (round.length === 1 && round[t.match]!.winner !== null)
    )
      throw Error();
    if (t.phase === 'playing') {
      if (typeof t.game !== 'string') throw Error();
      const game = decodeSnapshot(t.game);
      if (!game || isWon(game) || game.boardCode !== currentMatch(t).code) throw Error();
    } else if (t.game !== null) throw Error();
    return { tournament: t, error: '' };
  } catch (error) {
    return {
      tournament: null,
      error:
        error instanceof Error && error.message.startsWith('Unknown field:')
          ? error.message
          : 'Invalid tournament.',
    };
  }
}
