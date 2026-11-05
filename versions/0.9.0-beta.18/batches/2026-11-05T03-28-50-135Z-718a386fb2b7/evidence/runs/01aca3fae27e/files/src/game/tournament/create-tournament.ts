import { freshBoardCode } from '../session/fresh-board.ts';
import { makeTournament } from './model.ts';
import type { Tournament } from './model.ts';

export function createTournament(names: string[]): Tournament {
  const codes = new Set<string>();
  for (let i = 0; i < names.length - 1; i++) {
    const size = i < names.length / 2 ? (names.length === 8 ? 4 : 6) : i < names.length - 2 ? 6 : 8;
    let code: string;
    do {
      code = freshBoardCode(size);
    } while (codes.has(code));
    codes.add(code);
  }
  return makeTournament(names, [...codes]);
}
