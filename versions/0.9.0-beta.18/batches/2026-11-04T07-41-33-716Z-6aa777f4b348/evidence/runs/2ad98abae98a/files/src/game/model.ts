export const sizes = [4, 6, 8, 10, 12, 14, 16] as const;
export type Size = (typeof sizes)[number];
export const selectionKinds = { closed: 'closed', one: 'one', mismatch: 'mismatch' } as const;
export type Selection =
  | { readonly kind: typeof selectionKinds.closed }
  | { readonly kind: typeof selectionKinds.one; readonly index: number }
  | { readonly kind: typeof selectionKinds.mismatch; readonly first: number;
      readonly second: number; readonly remainingMs: number };

export interface BoardDescription {
  readonly code: string;
  readonly size: Size;
  readonly seed: number;
}
export interface GameState {
  readonly board: BoardDescription;
  readonly deck: readonly number[];
  readonly matched: readonly number[];
  readonly selection: Selection;
  readonly moves: number;
  readonly elapsedMs: number;
  readonly started: boolean;
}
export function isSize(value: unknown): value is Size {
  return sizes.some(size => size === value);
}
