import { freshBoardCode } from '../session/fresh-board.ts';
import { plannedMatchSizes } from './layout.ts';
import type { Tournament } from './model.ts';

export function createTournamentDeals(
  playerCount: 4 | 8,
  history: readonly Tournament[],
): string[] {
  const used = new Set(
    history.flatMap((item) =>
      item.rounds.flatMap((round) => round.matches.map((match) => match.boardCode)),
    ),
  );
  return plannedMatchSizes(playerCount).map((size) => {
    let code = freshBoardCode(size);
    while (used.has(code)) code = freshBoardCode(size);
    used.add(code);
    return code;
  });
}
