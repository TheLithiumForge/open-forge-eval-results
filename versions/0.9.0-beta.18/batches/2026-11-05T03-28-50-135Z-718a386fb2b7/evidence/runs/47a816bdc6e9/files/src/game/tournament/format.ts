import { parseBoardCode } from '../deck.ts';
import { isWon } from '../game.ts';
import { decodeSnapshot } from '../snapshot.ts';
import { hasExactKeys, isJsonObject, isWithinBytes, parseJson } from '../saved-format.ts';
import { currentMatch, normalizeNames, roundSize } from './rules.ts';
import type { Tournament } from './rules.ts';

export function encodeTournament(tournament: Tournament): string {
  const sorted = (value: unknown): unknown =>
    Array.isArray(value)
      ? value.map(sorted)
      : isJsonObject(value)
        ? Object.fromEntries(
            Object.keys(value)
              .sort()
              .map((key) => [key, sorted(value[key])]),
          )
        : value;
  return JSON.stringify(
    sorted({ format: 'neon-pairs/tournament', tournament, version: 1 }),
    null,
    2,
  );
}
export function decodeTournament(text: string): { tournament: Tournament | null; error: string } {
  const fail = (error = 'Invalid tournament.') => ({ tournament: null, error });
  if (!isWithinBytes(text, 262144)) return fail();
  const root = parseJson(text);
  function keys(value: unknown, expected: string[]): value is Record<string, unknown> {
    if (!isJsonObject(value)) return false;
    const extra = Object.keys(value).find((key) => !expected.includes(key));
    if (extra) throw new Error(`Unknown field: ${extra}.`);
    return hasExactKeys(value, expected);
  }
  try {
    if (
      !keys(root, ['format', 'tournament', 'version']) ||
      root.format !== 'neon-pairs/tournament' ||
      root.version !== 1 ||
      !keys(root.tournament, ['names', 'rounds', 'phase', 'snapshot', 'elapsedMs'])
    )
      return fail();
    const t = root.tournament;
    if (
      !Array.isArray(t.names) ||
      ![4, 8].includes(t.names.length) ||
      !t.names.every((n: unknown): n is string => typeof n === 'string')
    )
      return fail();
    const validated = normalizeNames(t.names);
    if (validated.error || JSON.stringify(validated.names) !== JSON.stringify(t.names))
      return fail();
    if (
      !Array.isArray(t.rounds) ||
      !t.rounds.length ||
      t.rounds.length > Math.log2(t.names.length) ||
      (t.phase !== 'ready' &&
        t.phase !== 'playing' &&
        t.phase !== 'turn' &&
        t.phase !== 'match' &&
        t.phase !== 'complete')
    )
      return fail();
    let expected =
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
    const codes = new Set<string>();
    let unfinished = false;
    const rounds: Tournament['rounds'] = [];
    for (const round of t.rounds) {
      if (!Array.isArray(round) || round.length !== expected.length) return fail();
      const winners: number[] = [];
      const parsedRound: Tournament['rounds'][number] = [];
      for (let i = 0; i < round.length; i++) {
        const m: unknown = round[i];
        if (
          !keys(m, ['players', 'code', 'results', 'winner']) ||
          JSON.stringify(m.players) !== JSON.stringify(expected[i]) ||
          typeof m.code !== 'string' ||
          parseBoardCode(m.code)?.size !== roundSize(round.length) ||
          codes.has(m.code) ||
          !Array.isArray(m.results) ||
          m.results.length !== 2
        )
          return fail();
        codes.add(m.code);
        for (const result of m.results)
          if (
            result !== null &&
            (!keys(result, ['moves', 'elapsedMs']) ||
              typeof result.moves !== 'number' ||
              !Number.isInteger(result.moves) ||
              result.moves < roundSize(round.length) ** 2 / 2 ||
              result.moves > 999999 ||
              typeof result.elapsedMs !== 'number' ||
              !Number.isFinite(result.elapsedMs) ||
              result.elapsedMs < 0 ||
              result.elapsedMs > 359999999)
          )
            return fail();
        const [a, b] = m.results;
        if ((!a && b) || (unfinished && (a || b || m.winner !== null))) return fail();
        let winner: number | null = null;
        if (a && b) {
          const decided =
            a.moves !== b.moves
              ? expected[i]![a.moves < b.moves ? 0 : 1]
              : a.elapsedMs !== b.elapsedMs
                ? expected[i]![a.elapsedMs < b.elapsedMs ? 0 : 1]
                : Math.min(...expected[i]!);
          if (decided === undefined || m.winner !== decided) return fail();
          winner = decided;
          winners.push(decided);
        } else {
          if (m.winner !== null) return fail();
          unfinished = true;
        }
        parsedRound.push({
          players: [expected[i]![0]!, expected[i]![1]!],
          code: m.code,
          results: [a, b],
          winner,
        });
      }
      rounds.push(parsedRound);
      expected = [];
      for (let i = 0; i < winners.length; i += 2)
        if (winners[i + 1] !== undefined) expected.push([winners[i]!, winners[i + 1]!]);
      if (unfinished && round !== t.rounds.at(-1)) return fail();
    }
    if (t.snapshot !== null && typeof t.snapshot !== 'string') return fail();
    if (
      t.elapsedMs !== null &&
      (typeof t.elapsedMs !== 'number' ||
        !Number.isFinite(t.elapsedMs) ||
        t.elapsedMs < 0 ||
        t.elapsedMs > 359999999)
    )
      return fail();
    const tournament: Tournament = {
      names: t.names,
      rounds,
      phase: t.phase,
      snapshot: t.snapshot,
      elapsedMs: t.elapsedMs,
    };
    const match = currentMatch(tournament);
    if (
      t.phase === 'complete'
        ? match.winner === null || tournament.rounds.at(-1)!.length !== 1
        : t.phase === 'match'
          ? match.winner === null && !tournament.rounds.at(-1)!.some((m) => m.winner !== null)
          : match.winner !== null
    )
      return fail();
    if (t.phase === 'match' && match.winner === null && match.results[0] !== null) return fail();
    if (t.phase === 'turn' && (!match.results[0] || match.results[1])) return fail();
    if ((t.phase === 'ready' || t.phase === 'playing') && match.results[1]) return fail();
    if (t.phase === 'playing') {
      const game = typeof t.snapshot === 'string' ? decodeSnapshot(t.snapshot) : null;
      if (
        !game ||
        isWon(game) ||
        game.boardCode !== match.code ||
        t.elapsedMs === null ||
        Math.floor(t.elapsedMs) !== game.elapsedMs
      )
        return fail();
    } else if (t.snapshot !== null || t.elapsedMs !== null) return fail();
    return { tournament, error: '' };
  } catch (error) {
    return fail(error instanceof Error ? error.message : undefined);
  }
}
