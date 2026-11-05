export interface Result {
  moves: number;
  elapsedMs: number;
}
export interface Match {
  players: [number, number];
  code: string;
  results: [Result | null, Result | null];
  winner: number | null;
}
type Phase = 'ready' | 'playing' | 'turnDone' | 'matchDone' | 'complete';
export interface TournamentState {
  names: string[];
  matches: Match[];
  phase: Phase;
  snapshot: string | null;
}

export function normalizeName(name: string): string {
  return name.trim().replace(/\s+/gu, ' ').normalize('NFC');
}
export function nameError(names: string[]): string {
  if (names.some((name) => Array.from(name).length < 2 || Array.from(name).length > 20))
    return 'Use 2 to 20 characters.';
  if (new Set(names.map((name) => name.toLowerCase())).size !== names.length)
    return 'Each name must be different.';
  return '';
}
export function opening(count: number): [number, number][] {
  return count === 4
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
}
export function roundSize(count: number, index: number): number {
  return count === 8 && index < 4 ? 4 : index < count - 2 ? 6 : 8;
}
export function roundName(count: number, index: number): string {
  return count === 8 && index < 4 ? 'Quarterfinal' : index < count - 2 ? 'Semifinal' : 'Final';
}
export function pairAt(names: string[], matches: Match[]): [number, number] {
  const index = matches.length;
  const first = opening(names.length);
  if (index < first.length) return first[index]!;
  const source = index === names.length - 2 ? (names.length === 8 ? 4 : 0) : (index - 4) * 2;
  return [matches[source]!.winner!, matches[source + 1]!.winner!];
}
export function winner(match: Match): number {
  const [a, b] = match.results;
  if (!a || !b) throw new Error('Both results are required.');
  return a.moves !== b.moves
    ? match.players[a.moves < b.moves ? 0 : 1]
    : a.elapsedMs !== b.elapsedMs
      ? match.players[a.elapsedMs < b.elapsedMs ? 0 : 1]
      : Math.min(...match.players);
}
export function newMatch(names: string[], matches: Match[], code: string): Match {
  return { players: pairAt(names, matches), code, results: [null, null], winner: null };
}

export function finishTurn(tournament: TournamentState, result: Result): TournamentState {
  const matches = [...tournament.matches];
  const previous = matches[matches.length - 1]!;
  const results: Match['results'] = previous.results[0]
    ? [previous.results[0], result]
    : [result, null];
  const match: Match = { ...previous, results, winner: null };
  if (results[1]) match.winner = winner(match);
  matches[matches.length - 1] = match;
  const phase =
    match.winner === null
      ? 'turnDone'
      : matches.length === tournament.names.length - 1
        ? 'complete'
        : 'matchDone';
  return { ...tournament, matches, phase, snapshot: null };
}
