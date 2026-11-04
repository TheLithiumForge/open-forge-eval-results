// Each arrow key moves board focus by one row or column. Edges keep focus on the same card.
const ARROW_STEPS = {
  ArrowLeft: { rows: 0, columns: -1 },
  ArrowRight: { rows: 0, columns: 1 },
  ArrowUp: { rows: -1, columns: 0 },
  ArrowDown: { rows: 1, columns: 0 },
} as const;

function isArrowKey(key: string): key is keyof typeof ARROW_STEPS {
  return Object.hasOwn(ARROW_STEPS, key);
}

// Returns the focus destination for an unmodified arrow key, or null for keys the board leaves to
// the browser.
export function arrowTarget(key: string, index: number, size: number): number | null {
  if (!isArrowKey(key)) return null;
  const step = ARROW_STEPS[key];
  const row = Math.floor(index / size) + step.rows;
  const column = (index % size) + step.columns;
  if (row < 0 || row >= size || column < 0 || column >= size) return index;
  return row * size + column;
}
