import { freshBoardCode } from '../session/fresh-board.ts';
import { boardSizeOf, matchCount } from './rules.ts';

// Both players of a match play one board code, and no two matches of a tournament share a code.
// The full code is compared, so equal seeds at different sizes are different deals.
export function dealCodes(players: number): string[] {
  const used = new Set<string>();
  return Array.from({ length: matchCount(players) }, (_, match) => {
    let code = freshBoardCode(boardSizeOf(players, match));
    while (used.has(code)) code = freshBoardCode(boardSizeOf(players, match));
    used.add(code);
    return code;
  });
}
