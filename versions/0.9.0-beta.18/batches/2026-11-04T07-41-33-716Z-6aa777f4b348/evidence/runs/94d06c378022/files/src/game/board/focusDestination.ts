export type BoardDirection = 'ArrowLeft' | 'ArrowRight' | 'ArrowUp' | 'ArrowDown';

export function focusDestination(index: number, size: number, direction: BoardDirection): number {
  const count = size * size;
  if (!Number.isSafeInteger(index) || index < 0 || index >= count) return 0;
  const row = Math.floor(index / size);
  const column = index % size;
  switch (direction) {
    case 'ArrowLeft': return column === 0 ? index : index - 1;
    case 'ArrowRight': return column === size - 1 ? index : index + 1;
    case 'ArrowUp': return row === 0 ? index : index - size;
    case 'ArrowDown': return row === size - 1 ? index : index + size;
    default: {
      const unreachable: never = direction;
      return unreachable;
    }
  }
}
