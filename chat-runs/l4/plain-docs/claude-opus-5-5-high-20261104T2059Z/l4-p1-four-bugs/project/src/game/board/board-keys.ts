// Each arrow key moves one row or column. A move past the board edge keeps the same card.
const ROW_STEPS = { ArrowUp: -1, ArrowDown: 1 } as const;
const COLUMN_STEPS = { ArrowLeft: -1, ArrowRight: 1 } as const;

interface BoardKey {
  readonly key: string;
  readonly altKey: boolean;
  readonly ctrlKey: boolean;
  readonly metaKey: boolean;
  readonly shiftKey: boolean;
}

// The focus destination for an unmodified arrow key, or null for keys the browser keeps.
export function arrowDestination(event: BoardKey, index: number, size: number): number | null {
  if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return null;
  const row = Math.floor(index / size);
  const column = index % size;
  if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
    const next = row + ROW_STEPS[event.key];
    return next < 0 || next >= size ? index : next * size + column;
  }
  if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
    const next = column + COLUMN_STEPS[event.key];
    return next < 0 || next >= size ? index : row * size + next;
  }
  return null;
}
