export const SELECTION = {
  closed: 'closed',
  one: 'one',
  mismatch: 'mismatch',
} as const;

export type Selection =
  | { readonly kind: typeof SELECTION.closed }
  | { readonly kind: typeof SELECTION.one; readonly index: number }
  | {
      readonly kind: typeof SELECTION.mismatch;
      readonly first: number;
      readonly second: number;
      readonly remainingMs: number;
    };

export const MISMATCH_MS = 800;
