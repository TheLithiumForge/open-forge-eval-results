// The four movement keys and the row and column step each one takes.
const MOVES = {
  ArrowLeft: { rows: 0, columns: -1 },
  ArrowRight: { rows: 0, columns: 1 },
  ArrowUp: { rows: -1, columns: 0 },
  ArrowDown: { rows: 1, columns: 0 },
} as const;

interface MovementKey {
  readonly key: string;
  readonly altKey: boolean;
  readonly ctrlKey: boolean;
  readonly metaKey: boolean;
  readonly shiftKey: boolean;
}

function isMoveKey(key: string): key is keyof typeof MOVES {
  return Object.hasOwn(MOVES, key);
}

// Returns the card a movement key focuses, or null for a key the board leaves to the browser.
// A move past a board edge keeps the current card.
export function movedCard(index: number, size: number, event: MovementKey): number | null {
  if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return null;
  if (!isMoveKey(event.key)) return null;
  const move = MOVES[event.key];
  const row = Math.floor(index / size) + move.rows;
  const column = (index % size) + move.columns;
  if (row < 0 || row >= size || column < 0 || column >= size) return index;
  return row * size + column;
}
