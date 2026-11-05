import { parseBoardCode } from '../deck.ts';
import { ELAPSED_MAX_MS, MOVES_MAX } from '../game.ts';

export interface Score {
  moves: number;
  elapsedMs: number;
}
interface Match {
  boardCode: string;
  players: [number | null, number | null];
  scores: [Score | null, Score | null];
  winner: number | null;
}
type Phase = 'ready' | 'playing' | 'turnDone' | 'matchDone' | 'complete';
export interface TournamentData {
  players: string[];
  matches: Match[];
  index: number;
  phase: Phase;
  snapshot: string | null;
}

export function normalizeNames(drafts: string[]): { names: string[]; error: string } {
  const names = drafts.map((name) => name.trim().replace(/\s+/gu, ' ').normalize('NFC'));
  if (names.some((name) => [...name].length < 2 || [...name].length > 20))
    return { names, error: 'Use 2 to 20 characters.' };
  if (new Set(names.map((name) => name.toLowerCase())).size !== names.length)
    return { names, error: 'Each name must be different.' };
  return { names, error: '' };
}

export function roundName(count: number, index: number): string {
  if (count === 8 && index < 4) return 'Quarterfinal';
  if (index < count - 2) return 'Semifinal';
  return 'Final';
}
export function roundSize(count: number, index: number): number {
  return roundName(count, index) === 'Quarterfinal'
    ? 4
    : roundName(count, index) === 'Semifinal'
      ? 6
      : 8;
}
export function createTournament(players: string[], codes: string[]): TournamentData {
  const order =
    players.length === 4
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
  const matches: Match[] = codes.map((boardCode, i) => ({
    boardCode,
    players: i < order.length ? [order[i]![0]!, order[i]![1]!] : [null, null],
    scores: [null, null],
    winner: null,
  }));
  return { players, matches, index: 0, phase: 'ready', snapshot: null };
}
export function recordScore(t: TournamentData, score: Score): TournamentData {
  const matches: Match[] = t.matches.map((match) => ({
    ...match,
    players: [match.players[0], match.players[1]],
    scores: [match.scores[0], match.scores[1]],
  }));
  const match = matches[t.index]!;
  if (!match.scores[0]) {
    match.scores[0] = score;
    return { ...t, matches, phase: 'turnDone', snapshot: null };
  }
  match.scores[1] = score;
  const a = match.scores[0],
    b = score;
  match.winner =
    a.moves !== b.moves
      ? a.moves < b.moves
        ? match.players[0]
        : match.players[1]
      : a.elapsedMs !== b.elapsedMs
        ? a.elapsedMs < b.elapsedMs
          ? match.players[0]
          : match.players[1]
        : Math.min(match.players[0]!, match.players[1]!);
  if (t.index < matches.length - 1) {
    const next = matches[t.players.length / 2 + Math.floor(t.index / 2)]!;
    next.players[t.index % 2] = match.winner;
  }
  return {
    ...t,
    matches,
    phase: t.index === matches.length - 1 ? 'complete' : 'matchDone',
    snapshot: null,
  };
}
export function isValidScore(value: unknown, size: number): value is Score {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  if (!('moves' in value) || !('elapsedMs' in value)) return false;
  const score = value;
  return (
    Object.keys(score).sort().join(',') === 'elapsedMs,moves' &&
    typeof score.moves === 'number' &&
    Number.isSafeInteger(score.moves) &&
    score.moves >= size ** 2 / 2 &&
    score.moves <= MOVES_MAX &&
    typeof score.elapsedMs === 'number' &&
    Number.isFinite(score.elapsedMs) &&
    score.elapsedMs >= 0 &&
    score.elapsedMs <= ELAPSED_MAX_MS
  );
}
export function isValidCode(code: unknown, size: number): code is string {
  return typeof code === 'string' && parseBoardCode(code)?.size === size;
}
