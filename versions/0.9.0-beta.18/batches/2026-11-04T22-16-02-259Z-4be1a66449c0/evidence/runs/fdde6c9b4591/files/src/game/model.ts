export const SIDE_LENGTHS = [4, 6, 8, 10, 12, 14, 16] as const;
export type SideLength = (typeof SIDE_LENGTHS)[number];

export const MOVE_LIMIT = 999_999;
export const TIME_LIMIT_MS = 359_999_999;
export const MISMATCH_MS = 800;

export type BoardDefinition = Readonly<{
  side: SideLength;
  seed: number;
  code: string;
}>;

export type Selection =
  | Readonly<{ kind: "closed" }>
  | Readonly<{ kind: "one"; index: number }>
  | Readonly<{ kind: "mismatch"; first: number; second: number; remainingMs: number }>;

export type GameState = Readonly<{
  board: BoardDefinition & Readonly<{ deck: readonly number[] }>;
  matched: readonly number[];
  selection: Selection;
  moves: number;
  elapsedMs: number;
  started: boolean;
}>;

export type BestScores = Readonly<Partial<Record<SideLength, number>>>;

export function isSideLength(value: unknown): value is SideLength {
  return typeof value === "number" && SIDE_LENGTHS.some((side) => side === value);
}
