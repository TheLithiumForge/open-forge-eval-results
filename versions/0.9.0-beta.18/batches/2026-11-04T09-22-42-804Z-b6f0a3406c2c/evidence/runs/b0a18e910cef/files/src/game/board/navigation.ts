// Arrow movement stays within the current row or column, including at the board edges.
export function cardInDirection(index: number, size: number, key: string): number | null {
  switch (key) {
    case 'ArrowLeft':
      return index % size > 0 ? index - 1 : index;
    case 'ArrowRight':
      return index % size < size - 1 ? index + 1 : index;
    case 'ArrowUp':
      return index >= size ? index - size : index;
    case 'ArrowDown':
      return index < size * (size - 1) ? index + size : index;
    default:
      return null;
  }
}
