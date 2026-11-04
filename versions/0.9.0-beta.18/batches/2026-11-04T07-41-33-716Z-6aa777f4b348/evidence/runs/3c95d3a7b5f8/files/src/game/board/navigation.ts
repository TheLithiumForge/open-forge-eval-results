export function nextCard(index: number, size: number, key: string): number | null {
  const column = index % size;
  switch (key) {
    case 'ArrowLeft': return column > 0 ? index - 1 : index;
    case 'ArrowRight': return column < size - 1 ? index + 1 : index;
    case 'ArrowUp': return index >= size ? index - size : index;
    case 'ArrowDown': return index < size * (size - 1) ? index + size : index;
    default: return null;
  }
}
