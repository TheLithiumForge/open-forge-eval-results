import { boardCode, parseBoardCode, SEED_MAX } from '../deck.ts';
import { freshBoardCode } from '../session/fresh-board.ts';
import { matchRound } from './rules.ts';

export function tournamentDeals(count: number): string[] {
  const codes: string[] = [];
  for (let i = 0; i < count - 1; i += 1) {
    const size = matchRound(count, i).size;
    let code = freshBoardCode(size);
    // A repeated random draw still produces a unique deal within this bracket.
    while (codes.includes(code))
      code = boardCode(size, ((parseBoardCode(code)?.seed ?? 1) % SEED_MAX) + 1);
    codes.push(code);
  }
  return codes;
}
