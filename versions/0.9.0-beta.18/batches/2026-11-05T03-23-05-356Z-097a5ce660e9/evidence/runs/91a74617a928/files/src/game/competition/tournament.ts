import { freshBoardCode } from '../session/fresh-board.ts';
import type { GameState } from '../game.ts';

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
type Phase = 'ready' | 'playing' | 'turnDone' | 'matchDone' | 'champion';
export interface Tournament {
  names: string[];
  rounds: Match[][];
  round: number;
  match: number;
  phase: Phase;
  game: string | null;
}
export const normalizeName = (name: string) => name.trim().replace(/\s+/gu, ' ').normalize('NFC');
export function nameError(names: string[]): string {
  if (names.some((name) => [...name].length < 2 || [...name].length > 20))
    return 'Use 2 to 20 characters.';
  if (new Set(names.map((name) => name.toLowerCase())).size !== names.length)
    return 'Each name must be different.';
  return '';
}
export function roundName(count: number): string {
  return count === 4 ? 'Quarterfinal' : count === 2 ? 'Semifinal' : 'Final';
}
function sizeFor(count: number): number {
  return count === 4 ? 4 : count === 2 ? 6 : 8;
}
function deal(size: number, used: string[]): string {
  let code: string;
  do {
    code = freshBoardCode(size);
  } while (used.includes(code));
  return code;
}
function makeRound(pairs: [number, number][], used: string[]): Match[] {
  return pairs.map((players) => {
    const code = deal(sizeFor(pairs.length), used);
    used.push(code);
    return { players, code, results: [null, null], winner: null };
  });
}
export function createTournament(names: string[]): Tournament {
  const pairs: [number, number][] =
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
  return { names, rounds: [makeRound(pairs, [])], round: 0, match: 0, phase: 'ready', game: null };
}
export function currentMatch(t: Tournament): Match {
  return t.rounds[t.round]![t.match]!;
}
export function currentPlayer(t: Tournament): number {
  const m = currentMatch(t);
  return m.players[m.results[0] ? 1 : 0]!;
}
export function recordResult(t: Tournament, game: GameState): Tournament {
  const rounds = t.rounds.map((round) =>
    round.map((m) => ({
      ...m,
      players: [...m.players] as [number, number],
      results: [...m.results] as [Result | null, Result | null],
    })),
  );
  const match = rounds[t.round]![t.match]!;
  const result = { moves: game.moves, elapsedMs: game.elapsedMs };
  if (!match.results[0]) {
    match.results[0] = result;
    return { ...t, rounds, phase: 'turnDone', game: null };
  }
  match.results[1] = result;
  const first = match.results[0];
  match.winner =
    first.moves !== result.moves
      ? match.players[first.moves < result.moves ? 0 : 1]
      : first.elapsedMs !== result.elapsedMs
        ? match.players[first.elapsedMs < result.elapsedMs ? 0 : 1]
        : Math.min(...match.players);
  return {
    ...t,
    rounds,
    phase: rounds[t.round]!.length === 1 ? 'champion' : 'matchDone',
    game: null,
  };
}
export function nextMatch(t: Tournament): Tournament {
  if (t.match + 1 < t.rounds[t.round]!.length) return { ...t, match: t.match + 1, phase: 'ready' };
  const winners = t.rounds[t.round]!.map((m) => m.winner!);
  const pairs: [number, number][] = [];
  for (let i = 0; i < winners.length; i += 2) pairs.push([winners[i]!, winners[i + 1]!]);
  const used = t.rounds.flat().map((m) => m.code);
  return {
    ...t,
    rounds: [...t.rounds, makeRound(pairs, used)],
    round: t.round + 1,
    match: 0,
    phase: 'ready',
  };
}
