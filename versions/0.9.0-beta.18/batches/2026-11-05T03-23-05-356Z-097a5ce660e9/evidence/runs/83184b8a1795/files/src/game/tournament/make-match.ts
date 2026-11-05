import { freshBoardCode } from '../session/fresh-board.ts';
import { nextPlayers, roundSize } from './model.ts';
import type { TournamentState } from './model.ts';
export function makeMatch(t: TournamentState): TournamentState {
  const players = nextPlayers(t);
  if (!players) return t;
  let code: string;
  do {
    code = freshBoardCode(roundSize(t.names.length, t.matches.length));
  } while (t.matches.some((match) => match.code === code));
  return { ...t, matches: [...t.matches, { players, code, results: [] }] };
}
