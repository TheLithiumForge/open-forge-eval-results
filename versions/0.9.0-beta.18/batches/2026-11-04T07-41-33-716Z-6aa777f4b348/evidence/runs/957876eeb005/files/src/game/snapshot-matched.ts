import { isPosition } from './json-input.ts';

export function decodeMatched(value: unknown, deck: readonly number[]): readonly number[] | null {
  if (!Array.isArray(value) || value.length > deck.length) return null;
  const candidates: readonly unknown[] = value;
  const matched: number[] = [];
  const counts = new Map<number, number>();
  for (const index of candidates) {
    if (!isPosition(index, deck.length) || matched.includes(index)) return null;
    const face = deck[index];
    if (face === undefined) return null;
    matched.push(index);
    counts.set(face, (counts.get(face) ?? 0) + 1);
  }
  return [...counts.values()].every(count => count === 2) ? matched : null;
}
