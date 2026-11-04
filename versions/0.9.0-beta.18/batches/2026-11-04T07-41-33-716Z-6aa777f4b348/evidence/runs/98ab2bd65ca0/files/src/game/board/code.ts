import { isBoardSize, type BoardSize } from "./sizes.ts";

export interface BoardCode {
  readonly value: string;
  readonly size: BoardSize;
  readonly seed: number;
}

export function parseBoardCode(value: string): BoardCode | null {
  const match = /^np1-(4|6|8|10|12|14|16)-([1-9][0-9]*)$/.exec(value);
  if (match?.[0] !== value) return null;
  const sizePart = match?.[1];
  const seedPart = match?.[2];

  if (sizePart === undefined || seedPart === undefined) return null;

  const size = Number(sizePart);
  const seed = Number(seedPart);
  if (!isBoardSize(size) || !Number.isSafeInteger(seed) || seed > 2147483646) {
    return null;
  }

  return { value, size, seed };
}
