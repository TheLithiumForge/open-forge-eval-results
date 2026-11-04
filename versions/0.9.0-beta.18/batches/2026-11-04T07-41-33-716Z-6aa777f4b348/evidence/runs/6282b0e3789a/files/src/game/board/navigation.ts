export function arrowDestination(index: number, size: number, key: string): number | null {
  const row = Math.floor(index / size);
  const column = index % size;
  switch (key) {
    case 'ArrowLeft': return column > 0 ? index - 1 : index;
    case 'ArrowRight': return column < size - 1 ? index + 1 : index;
    case 'ArrowUp': return row > 0 ? index - size : index;
    case 'ArrowDown': return row < size - 1 ? index + size : index;
    default: return null;
  }
}
