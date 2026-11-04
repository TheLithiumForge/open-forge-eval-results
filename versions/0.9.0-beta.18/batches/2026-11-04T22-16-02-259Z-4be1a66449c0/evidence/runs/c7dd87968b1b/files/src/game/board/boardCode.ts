import { isGridSize, type GridSize } from './sizes.ts';

export type BoardCode = Readonly<{ code: string; size: GridSize; seed: number }>;

export function parseBoardCode(input: string): BoardCode | null {
  const match = /^np1-(4|6|8|10|12|14|16)-([1-9][0-9]*)$/.exec(input);
  if (!match) return null;
  const size = Number(match[1]);
  const seed = Number(match[2]);
  if (!isGridSize(size) || !Number.isSafeInteger(seed) || seed > 2_147_483_646) return null;
  return { code: `np1-${size}-${seed}`, size, seed };
}
