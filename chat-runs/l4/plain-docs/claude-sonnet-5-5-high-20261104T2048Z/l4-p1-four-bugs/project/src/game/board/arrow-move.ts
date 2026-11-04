// I06 and I07: arrow keys move within the grid and stop at its edges.
const ArrowKey = {
  left: 'ArrowLeft',
  right: 'ArrowRight',
  up: 'ArrowUp',
  down: 'ArrowDown',
} as const;

export function arrowTarget(key: string, index: number, size: number): number | null {
  const row = Math.floor(index / size);
  const column = index % size;
  switch (key) {
    case ArrowKey.left:
      return column > 0 ? index - 1 : index;
    case ArrowKey.right:
      return column < size - 1 ? index + 1 : index;
    case ArrowKey.up:
      return row > 0 ? index - size : index;
    case ArrowKey.down:
      return row < size - 1 ? index + size : index;
    default:
      return null;
  }
}
