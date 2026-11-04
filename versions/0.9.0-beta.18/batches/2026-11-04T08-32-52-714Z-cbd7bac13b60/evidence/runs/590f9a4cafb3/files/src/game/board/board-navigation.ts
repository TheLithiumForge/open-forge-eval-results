// Arrow movement stays in the current row or column and stops at the board edge.
export function nextCard(index: number, size: number, key: string): number | null {
  switch (key) {
    case 'ArrowLeft':
      return index % size > 0 ? index - 1 : index;
    case 'ArrowRight':
      return index % size < size - 1 ? index + 1 : index;
    case 'ArrowUp':
      return index >= size ? index - size : index;
    case 'ArrowDown':
      return index + size < size ** 2 ? index + size : index;
    default:
      return null;
  }
}
