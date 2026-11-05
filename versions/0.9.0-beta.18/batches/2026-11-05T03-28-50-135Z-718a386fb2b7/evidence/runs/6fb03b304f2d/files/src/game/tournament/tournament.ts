import { freshBoardCode } from '../session/fresh-board.ts';

interface Score {
  moves: number;
  elapsedMs: number;
}
interface Match {
  code: string;
  players: [number | null, number | null];
  scores: [Score | null, Score | null];
  winner: number | null;
}
type Phase = 'ready' | 'playing' | 'turnComplete' | 'matchComplete' | 'complete';
export interface TournamentState {
  names: string[];
  matches: Match[];
  current: number;
  phase: Phase;
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
export function roundSize(count: number, index: number): number {
  if (index >= count - 2) return 8;
  return count === 8 && index < 4 ? 4 : 6;
}
export function roundName(count: number, index: number): string {
  const size = roundSize(count, index);
  return size === 4 ? 'Quarterfinal' : size === 6 ? 'Semifinal' : 'Final';
}
export function createTournament(names: string[]): TournamentState {
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
  const used = new Set<string>();
  const matches = Array.from({ length: names.length - 1 }, (_, i): Match => {
    let code: string;
    do {
      code = freshBoardCode(roundSize(names.length, i));
    } while (used.has(code));
    used.add(code);
    const pair = pairs[i];
    return {
      code,
      players: pair ? [pair[0]!, pair[1]!] : [null, null],
      scores: [null, null],
      winner: null,
    };
  });
  return { names, matches, current: 0, phase: 'ready' };
}
export function recordScore(t: TournamentState, score: Score): TournamentState {
  const matches: Match[] = t.matches.map((match) => ({
    ...match,
    players: [match.players[0], match.players[1]],
    scores: [match.scores[0], match.scores[1]],
  }));
  const match = matches[t.current]!;
  const slot = match.scores[0] === null ? 0 : 1;
  match.scores[slot] = score;
  if (slot === 0) return { ...t, matches, phase: 'turnComplete' };
  const a = match.scores[0]!;
  const b = match.scores[1]!;
  const firstWins =
    a.moves < b.moves ||
    (a.moves === b.moves &&
      (a.elapsedMs < b.elapsedMs ||
        (a.elapsedMs === b.elapsedMs && match.players[0]! < match.players[1]!)));
  match.winner = match.players[firstWins ? 0 : 1];
  if (t.current === matches.length - 1) return { ...t, matches, phase: 'complete' };
  const opening = t.names.length / 2;
  const destination =
    t.current < opening ? opening + Math.floor(t.current / 2) : matches.length - 1;
  matches[destination]!.players[t.current % 2] = match.winner;
  return { ...t, matches, phase: 'matchComplete' };
}
export function encodeExchange(
  tournament: TournamentState | null,
  snapshot: string | null,
): string {
  const sort = (_key: string, value: unknown): unknown =>
    value && typeof value === 'object' && !Array.isArray(value)
      ? Object.fromEntries(Object.entries(value).sort(([a], [b]) => a.localeCompare(b)))
      : value;
  return JSON.stringify(
    { format: 'neon-pairs/tournament', version: 1, tournament, snapshot },
    sort,
    2,
  );
}
