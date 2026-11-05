import { freshBoardCode } from '../session/fresh-board.ts';
import { tournamentStages } from './rules.ts';

export function freshTournamentDeals(count: number): readonly string[] {
  const codes: string[] = [];
  for (const stage of tournamentStages(count)) {
    let code: string;
    do {
      code = freshBoardCode(stage.size);
    } while (codes.includes(code));
    codes.push(code);
  }
  return codes;
}
