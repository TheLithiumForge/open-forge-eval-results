export const SELECTION_KINDS = {
  closed: 'closed',
  one: 'one',
  mismatch: 'mismatch',
} as const;
export const MISMATCH_MS = 800;

export type Selection =
  | { readonly kind: typeof SELECTION_KINDS.closed }
  | { readonly kind: typeof SELECTION_KINDS.one; readonly index: number }
  | {
      readonly kind: typeof SELECTION_KINDS.mismatch;
      readonly first: number;
      readonly second: number;
      readonly remainingMs: number;
    };

export const CLOSED: Selection = Object.freeze({ kind: SELECTION_KINDS.closed });
