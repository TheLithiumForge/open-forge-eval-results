export const BOARD_SIZES = [4, 6, 8, 10, 12, 14, 16] as const;
export const MAX_SEED = 2_147_483_646;
const MODULUS = 2_147_483_647;
const MULTIPLIER = 16_807;

export type BoardSize = (typeof BOARD_SIZES)[number];
export type Board = Readonly<{
  boardCode: string;
  size: BoardSize;
  deck: readonly number[];
}>;

export function isBoardSize(value: unknown): value is BoardSize {
  return typeof value === "number" && BOARD_SIZES.some((size) => size === value);
}

export function parseBoardCode(code: string): Board | null {
  const match = /^np1-(4|6|8|10|12|14|16)-([1-9][0-9]*)$/.exec(code);
  if (!match) return null;
  const size = Number(match[1]);
  const seed = Number(match[2]);
  if (!isBoardSize(size) || !Number.isSafeInteger(seed) || seed > MAX_SEED) return null;
  return Object.freeze({ boardCode: code, size, deck: Object.freeze(generateDeck(size, seed)) });
}

export function generateDeck(size: BoardSize, seed: number): number[] {
  let randomState = seed;
  const draw = (bound: number): number => {
    const range = MODULUS - 1;
    const limit = Math.floor(range / bound) * bound;
    while (true) {
      randomState = (randomState * MULTIPLIER) % MODULUS;
      const value = randomState - 1;
      if (value < limit) return value % bound;
    }
  };
  const deck = Array.from({ length: size * size }, (_, index) => Math.floor(index / 2));
  for (let index = deck.length - 1; index > 0; index -= 1) {
    const swapIndex = draw(index + 1);
    [deck[index], deck[swapIndex]] = [deck[swapIndex]!, deck[index]!];
  }
  return deck;
}
