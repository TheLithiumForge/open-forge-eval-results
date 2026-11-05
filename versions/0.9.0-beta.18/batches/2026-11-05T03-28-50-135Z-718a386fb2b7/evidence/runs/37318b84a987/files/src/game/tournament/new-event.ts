import { freshBoardCode } from '../session/fresh-board.ts';
import { createTournament, roundSize } from './rules.ts';
import type { Tournament } from './rules.ts';

export function newEvent(names: string[]): Tournament {
  const used = new Set<string>();
  const codes: string[][] = [];
  for (let count = names.length / 2; count >= 1; count /= 2) {
    const round: string[] = [];
    for (let i = 0; i < count; i++) {
      let code: string;
      do {
        code = freshBoardCode(roundSize(count));
      } while (used.has(code));
      used.add(code);
      round.push(code);
    }
    codes.push(round);
  }
  return createTournament(names, codes);
}
