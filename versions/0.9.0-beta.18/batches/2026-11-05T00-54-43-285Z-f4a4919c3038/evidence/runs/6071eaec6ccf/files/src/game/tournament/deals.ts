import { boardCode, parseBoardCode, SEED_MAX } from '../deck.ts';
import { freshBoardCode } from '../session/fresh-board.ts';
import { roundFor } from './rules.ts';

export function tournamentDeals(count: number): string[] {
  const codes: string[] = [];
  for (let index = 0; index < count - 1; index++) {
    const size = roundFor(count, index).size;
    let code = freshBoardCode(size);
    while (codes.includes(code)) {
      const seed = parseBoardCode(code)?.seed ?? 1;
      code = boardCode(size, (seed % SEED_MAX) + 1);
    }
    codes.push(code);
  }
  return codes;
}
