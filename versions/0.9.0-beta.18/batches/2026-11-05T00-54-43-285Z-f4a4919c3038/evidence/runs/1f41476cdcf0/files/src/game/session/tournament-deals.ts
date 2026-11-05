import { boardCode, parseBoardCode, SEED_MAX } from '../deck.ts';
import { tournamentRound } from '../tournament/rules.ts';
import { freshBoardCode } from './fresh-board.ts';

export function tournamentDeals(count: number): readonly string[] {
  const codes: string[] = [];
  for (let index = 0; index < count - 1; index++) {
    const { size } = tournamentRound(count, index);
    let code = freshBoardCode(size);
    while (codes.includes(code)) {
      const parsed = parseBoardCode(code);
      if (!parsed) throw new Error('Invalid generated board code.');
      code = boardCode(size, (parsed.seed % SEED_MAX) + 1);
    }
    codes.push(code);
  }
  return codes;
}
