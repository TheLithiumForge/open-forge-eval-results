import { parseBoardCode } from './boardCode.ts';

export function generateDeck(code: string): readonly number[] | null {
  const board = parseBoardCode(code);
  if (!board) return null;
  const count = board.size * board.size;
  const deck: number[] = [];
  for (let face = 0; face < count / 2; face += 1) deck.push(face, face);

  let state = board.seed;
  const draw = (bound: number): number => {
    const range = 2_147_483_646;
    const limit = Math.floor(range / bound) * bound;
    while (true) {
      state = (state * 16_807) % 2_147_483_647;
      const value = state - 1;
      if (value < limit) return value % bound;
    }
  };
  for (let i = count - 1; i > 0; i -= 1) {
    const j = draw(i + 1);
    const value = deck[i];
    const other = deck[j];
    if (value === undefined || other === undefined) return null;
    deck[i] = other;
    deck[j] = value;
  }
  return Object.freeze(deck);
}
