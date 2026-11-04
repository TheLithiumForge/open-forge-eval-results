export const SIZES = [4, 6, 8, 10, 12, 14, 16] as const;
export type Size = typeof SIZES[number];
export function isSize(value: unknown): value is Size {
  return typeof value === 'number' && SIZES.some(size => size === value);
}
export function parseBoardCode(code: string): { size: Size; seed: number } | null {
  const match = /^np1-(4|6|8|10|12|14|16)-([1-9]\d*)$/.exec(code);
  if (!match) return null;
  const size = Number(match[1]);
  const seed = Number(match[2]);
  return isSize(size) && Number.isSafeInteger(seed) && seed <= 2147483646 ? { size, seed } : null;
}
export function makeDeck(size: Size, seed: number): readonly number[] {
  const deck = Array.from({ length: size * size }, (_, i) => Math.floor(i / 2));
  let state = seed;
  for (let i = deck.length - 1; i > 0; i--) {
    const bound = i + 1;
    const limit = Math.floor(2147483646 / bound) * bound;
    let x: number;
    do { state = (state * 16807) % 2147483647; x = state - 1; } while (x >= limit);
    const j = x % bound;
    const a = deck[i]; const b = deck[j];
    if (a === undefined || b === undefined) throw new Error('Invalid shuffle');
    deck[i] = b; deck[j] = a;
  }
  return deck;
}
