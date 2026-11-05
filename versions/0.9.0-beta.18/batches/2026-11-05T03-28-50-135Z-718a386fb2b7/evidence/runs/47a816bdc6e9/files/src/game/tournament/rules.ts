interface Result {
  moves: number;
  elapsedMs: number;
}
interface Match {
  players: [number, number];
  code: string;
  results: [Result | null, Result | null];
  winner: number | null;
}
export interface Tournament {
  names: string[];
  rounds: Match[][];
  phase: 'ready' | 'playing' | 'turn' | 'match' | 'complete';
  snapshot: string | null;
  elapsedMs: number | null;
}

export function normalizeNames(drafts: string[]): { names: string[]; error: string } {
  const names = drafts.map((name) => name.trim().replace(/\s+/gu, ' ').normalize('NFC'));
  if (names.some((name) => [...name].length < 2 || [...name].length > 20))
    return { names, error: 'Use 2 to 20 characters.' };
  if (new Set(names.map((name) => name.toLowerCase())).size !== names.length)
    return { names, error: 'Each name must be different.' };
  return { names, error: '' };
}

export function createTournament(names: string[], codes: string[]): Tournament {
  const pairs =
    names.length === 4
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
  return {
    names,
    rounds: [
      pairs.map((pair, i) => ({
        players: pair as [number, number],
        code: codes[i]!,
        results: [null, null],
        winner: null,
      })),
    ],
    phase: 'ready',
    snapshot: null,
    elapsedMs: null,
  };
}

export function currentMatch(t: Tournament): Match {
  return (
    t.rounds[t.rounds.length - 1]!.find((match) => match.winner === null) ??
    t.rounds[t.rounds.length - 1]!.at(-1)!
  );
}
export function currentPlayer(t: Tournament): number {
  const match = currentMatch(t);
  return match.players[match.results[0] === null ? 0 : 1];
}
export function roundName(count: number): string {
  return count === 4 ? 'Quarterfinal' : count === 2 ? 'Semifinal' : 'Final';
}
export function roundSize(count: number): number {
  return count === 4 ? 4 : count === 2 ? 6 : 8;
}

export function recordResult(t: Tournament, result: Result): Tournament {
  const rounds = t.rounds.map((round) =>
    round.map((match): Match => ({ ...match, results: [match.results[0], match.results[1]] })),
  );
  const round = rounds.at(-1)!;
  const match = round.find((item) => item.winner === null)!;
  const slot = match.results[0] === null ? 0 : 1;
  match.results[slot] = result;
  if (slot === 0) return { ...t, rounds, phase: 'turn', snapshot: null, elapsedMs: null };
  const a = match.results[0]!;
  const b = match.results[1]!;
  match.winner =
    a.moves !== b.moves
      ? match.players[a.moves < b.moves ? 0 : 1]
      : a.elapsedMs !== b.elapsedMs
        ? match.players[a.elapsedMs < b.elapsedMs ? 0 : 1]
        : Math.min(...match.players);
  return {
    ...t,
    rounds,
    phase: round.length === 1 ? 'complete' : 'match',
    snapshot: null,
    elapsedMs: null,
  };
}

export function nextMatch(t: Tournament, codes: string[]): Tournament {
  const last = t.rounds.at(-1)!;
  if (last.some((match) => match.winner === null)) return { ...t, phase: 'ready' };
  const next: Match[] = [];
  for (let i = 0; i < last.length; i += 2)
    next.push({
      players: [last[i]!.winner!, last[i + 1]!.winner!],
      code: codes[i / 2]!,
      results: [null, null],
      winner: null,
    });
  return { ...t, rounds: [...t.rounds, next], phase: 'ready' };
}
