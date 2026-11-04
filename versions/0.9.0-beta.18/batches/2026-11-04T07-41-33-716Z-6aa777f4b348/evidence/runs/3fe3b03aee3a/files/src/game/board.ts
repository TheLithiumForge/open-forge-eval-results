import type { Board, BoardSize, GameState } from "./types.ts";

const modulus = 2_147_483_647;
const drawRange = modulus - 1;

export function parseBoardCode(text: string): Readonly<{ code: string; size: BoardSize; seed: number }> | null {
  const match = /^np1-(4|6|8|10|12|14|16)-([1-9][0-9]*)$/.exec(text);
  if (match === null || match[0] !== text) return null;
  const numericSize = Number(match[1]);
  const size = parseSize(numericSize);
  const seed = Number(match[2]);
  if (size === null || !Number.isSafeInteger(seed) || seed > drawRange) return null;
  return { code: text, size, seed };
}

function parseSize(value: number): BoardSize | null {
  switch (value) {
    case 4: return 4;
    case 6: return 6;
    case 8: return 8;
    case 10: return 10;
    case 12: return 12;
    case 14: return 14;
    case 16: return 16;
    default: return null;
  }
}

function nextState(state: number): number {
  return (state * 16_807) % modulus;
}

function drawBounded(state: number, bound: number): Readonly<{ state: number; value: number }> {
  const limit = Math.floor(drawRange / bound) * bound;
  let next = state;
  while (true) {
    next = nextState(next);
    const value = next - 1;
    if (value < limit) return { state: next, value: value % bound };
  }
}

export function createBoard(boardCode: string): Board | null {
  const parsed = parseBoardCode(boardCode);
  if (parsed === null) return null;
  const count = parsed.size * parsed.size;
  const deck: number[] = [];
  for (let face = 0; face < count / 2; face += 1) deck.push(face, face);
  let state = parsed.seed;
  for (let index = count - 1; index > 0; index -= 1) {
    const drawn = drawBounded(state, index + 1);
    state = drawn.state;
    const current = deck[index];
    const other = deck[drawn.value];
    if (current === undefined || other === undefined) return null;
    deck[index] = other;
    deck[drawn.value] = current;
  }
  return Object.freeze({ code: parsed.code, size: parsed.size, deck: Object.freeze(deck) });
}

export function createGame(boardCode: string): GameState {
  const board = createBoard(boardCode);
  if (board === null) throw new RangeError("Invalid board code.");
  return Object.freeze({
    board,
    matched: Object.freeze([]),
    selection: Object.freeze({ kind: "closed" as const }),
    moves: 0,
    elapsedMs: 0,
    started: false
  });
}
