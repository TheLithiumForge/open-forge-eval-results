export interface Result {
  moves: number;
  elapsedMs: number;
}
interface Match {
  boardCode: string;
  players: [number | null, number | null];
  results: [Result | null, Result | null];
  winner: number | null;
}
export interface Tournament {
  names: string[];
  matches: Match[];
  index: number;
}

export function normalizeName(name: string): string {
  return name.trim().replace(/\s+/gu, ' ').normalize('NFC');
}
export function nameError(names: string[]): string {
  if (names.some((name) => [...name].length < 2 || [...name].length > 20))
    return 'Use 2 to 20 characters.';
  if (new Set(names.map((name) => name.toLowerCase())).size !== names.length)
    return 'Each name must be different.';
  return '';
}
export function makeTournament(names: string[], codes: string[]): Tournament {
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
  const matches: Match[] = [];
  for (let i = 0; i < names.length - 1; i++) {
    const pair = pairs[i];
    matches.push({
      boardCode: codes[i]!,
      players: pair ? [pair[0]!, pair[1]!] : [null, null],
      results: [null, null],
      winner: null,
    });
  }
  return { names, matches, index: 0 };
}
export function recordResult(t: Tournament, result: Result): Tournament {
  const matches: Match[] = t.matches.map((m) => ({
    ...m,
    players: [m.players[0], m.players[1]],
    results: [m.results[0], m.results[1]],
  }));
  const match = matches[t.index]!;
  const turn = match.results[0] === null ? 0 : 1;
  match.results[turn] = result;
  if (match.results[0] && match.results[1]) {
    const a = match.results[0],
      b = match.results[1];
    match.winner =
      a.moves !== b.moves
        ? match.players[a.moves < b.moves ? 0 : 1]
        : a.elapsedMs !== b.elapsedMs
          ? match.players[a.elapsedMs < b.elapsedMs ? 0 : 1]
          : Math.min(match.players[0]!, match.players[1]!);
    if (t.index < matches.length - 1) {
      const next = Math.floor(t.index / 2) + t.names.length / 2;
      matches[next]!.players[t.index % 2] = match.winner;
    }
  }
  return { ...t, matches };
}
