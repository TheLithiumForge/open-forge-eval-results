export const SIZES = [4, 6, 8, 10, 12, 14, 16] as const;
export type Size = (typeof SIZES)[number];
export function isSize(value: unknown): value is Size {
  return typeof value === 'number' && SIZES.some(size => size === value);
}
export type Board = Readonly<{ code: string; size: Size; deck: readonly number[] }>;
export function parseBoard(code: string): Board | null {
  const match = /^np1-(4|6|8|10|12|14|16)-([1-9][0-9]*)$/.exec(code);
  if (!match) return null;
  const size = Number(match[1]);
  let seed = Number(match[2]);
  if (!isSize(size) || !Number.isSafeInteger(seed) || seed > 2147483646) return null;
  const deck = Array.from({ length: size * size }, (_, i) => Math.floor(i / 2));
  for (let i = deck.length - 1; i > 0; i--) {
    const bound = i + 1, limit = Math.floor(2147483646 / bound) * bound;
    let x: number;
    do { seed = (seed * 16807) % 2147483647; x = seed - 1; } while (x >= limit);
    const j = x % bound;
    const a = deck[i], b = deck[j];
    if (a === undefined || b === undefined) throw new Error('Invalid shuffle');
    deck[i] = b; deck[j] = a;
  }
  return { code, size, deck };
}
