import { freshBoardCode } from '../session/fresh-board.ts';

// One fresh board code for each size. A match never reuses the full code of an earlier match.
export function dealCodes(
  sizes: readonly number[],
  fresh: (size: number) => string = freshBoardCode,
): string[] {
  const codes: string[] = [];
  for (const size of sizes) {
    let code = fresh(size);
    while (codes.includes(code)) code = fresh(size);
    codes.push(code);
  }
  return codes;
}
