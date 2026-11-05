import { parseBoardCode } from '../deck.ts';
import { freshBoardCode } from '../session/fresh-board.ts';
import { roundPlan } from './rules.ts';

export function freshTournamentDeals(playerCount: 4 | 8): string[] {
  const codes: string[] = [];
  const used = new Set<string>();
  let previousSeed: number | undefined;
  for (const round of roundPlan(playerCount)) {
    for (let match = 0; match < round.count; match += 1) {
      let code = freshBoardCode(round.size, previousSeed);
      while (used.has(code)) code = freshBoardCode(round.size, parseBoardCode(code)?.seed);
      const parsed = parseBoardCode(code);
      if (!parsed) throw new Error('Could not create a tournament deal.');
      codes.push(code);
      used.add(code);
      previousSeed = parsed.seed;
    }
  }
  return codes;
}
