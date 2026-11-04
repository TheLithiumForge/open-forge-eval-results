export const GRID_SIZES = [4, 6, 8, 10, 12, 14, 16] as const;
const MODULUS = 2_147_483_647;
const GENERATOR = 16_807;
const DRAW_RANGE = MODULUS - 1;

export type GridSize = (typeof GRID_SIZES)[number];
export type Board = Readonly<{ boardCode: string; side: GridSize; deck: readonly number[] }>;
export type BoardCode = Readonly<{ boardCode: string; side: GridSize; seed: number }>;

const isGridSize = (value: number): value is GridSize =>
  GRID_SIZES.some((size) => size === value);

export function parseBoardCode(input: string): BoardCode | null {
  const match = /^np1-(4|6|8|10|12|14|16)-([1-9][0-9]*)$/.exec(input);
  if (match === null || match[0] !== input) return null;
  const sideText = match[1];
  const seedText = match[2];
  if (sideText === undefined || seedText === undefined) return null;
  const side = Number(sideText);
  const seed = Number(seedText);
  if (!isGridSize(side) || !Number.isSafeInteger(seed) || seed > DRAW_RANGE) return null;
  return { boardCode: input, side, seed };
}

function nextState(state: number): number {
  return (state * GENERATOR) % MODULUS;
}

function drawIndex(state: number, bound: number): Readonly<{ state: number; index: number }> {
  const limit = Math.floor(DRAW_RANGE / bound) * bound;
  let current = state;
  let value = 0;
  do {
    current = nextState(current);
    value = current - 1;
  } while (value >= limit);
  return { state: current, index: value % bound };
}

export function generateBoard(code: BoardCode): Board {
  const count = code.side * code.side;
  const deck = Array.from({ length: count }, (_, index) => Math.floor(index / 2));
  let state = code.seed;
  for (let index = count - 1; index > 0; index -= 1) {
    const draw = drawIndex(state, index + 1);
    state = draw.state;
    const value = deck[index];
    const other = deck[draw.index];
    if (value !== undefined && other !== undefined) {
      deck[index] = other;
      deck[draw.index] = value;
    }
  }
  return { boardCode: code.boardCode, side: code.side, deck };
}
