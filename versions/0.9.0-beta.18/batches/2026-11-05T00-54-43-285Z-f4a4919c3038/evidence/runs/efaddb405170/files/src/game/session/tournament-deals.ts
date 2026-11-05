import { matchStage } from '../tournament/rules.ts';
import { freshBoardCode } from './fresh-board.ts';

export function tournamentDeals(count: number): readonly string[] {
  const codes: string[] = [];
  for (let index = 0; index < count - 1; index += 1) {
    let code: string;
    do {
      code = freshBoardCode(matchStage(count, index).size);
    } while (codes.includes(code));
    codes.push(code);
  }
  return codes;
}
