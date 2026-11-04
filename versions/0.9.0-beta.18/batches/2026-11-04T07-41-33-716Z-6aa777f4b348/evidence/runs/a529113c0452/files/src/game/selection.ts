export const SELECTION = { closed: 'closed', one: 'one', mismatch: 'mismatch' } as const;
export const MISMATCH_MS = 800;

export type Selection =
  | Readonly<{ kind: typeof SELECTION.closed }>
  | Readonly<{ kind: typeof SELECTION.one; index: number }>
  | Readonly<{ kind: typeof SELECTION.mismatch; first: number; second: number; remainingMs: number }>;

export const CLOSED_SELECTION: Selection = Object.freeze({ kind: SELECTION.closed });
