export const sizes = [4, 6, 8, 10, 12, 14, 16] as const;
export type Size = typeof sizes[number];
export function isSize(value: number): value is Size { return sizes.some(size => size === value); }
export interface Board { readonly code: string; readonly size: Size; readonly deck: readonly number[] }
export function parseBoard(code: string): Board | null {
  const match = /^np1-(4|6|8|10|12|14|16)-([1-9][0-9]*)$/.exec(code);
  if (!match || !match[1] || !match[2]) return null;
  const size = Number(match[1]), seed = Number(match[2]);
  if (!isSize(size) || !Number.isSafeInteger(seed) || seed > 2147483646) return null;
  let state = seed;
  const deck = Array.from({ length: size * size }, (_, i) => Math.floor(i / 2));
  for (let i = deck.length - 1; i > 0; i--) {
    const b = i + 1, limit = Math.floor(2147483646 / b) * b;
    let x: number;
    do { state = (state * 16807) % 2147483647; x = state - 1; } while (x >= limit);
    const j = x % b, a = deck[i], c = deck[j];
    if (a === undefined || c === undefined) throw new Error('Invalid shuffle');
    deck[i] = c; deck[j] = a;
  }
  return { code, size, deck };
}
