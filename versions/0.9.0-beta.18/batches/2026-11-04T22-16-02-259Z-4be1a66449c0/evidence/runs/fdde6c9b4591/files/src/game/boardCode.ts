import { isSideLength, type BoardDefinition } from "./model.ts";

export const MAX_SEED = 2_147_483_646;

export function parseBoardCode(value: string): BoardDefinition | null {
  const match = /^np1-(4|6|8|10|12|14|16)-([1-9][0-9]*)$/.exec(value);
  if (!match) return null;
  const side = Number(match[1]);
  const seed = Number(match[2]);
  if (!isSideLength(side) || !Number.isSafeInteger(seed) || seed > MAX_SEED) return null;
  return { side, seed, code: `np1-${side}-${seed}` };
}
