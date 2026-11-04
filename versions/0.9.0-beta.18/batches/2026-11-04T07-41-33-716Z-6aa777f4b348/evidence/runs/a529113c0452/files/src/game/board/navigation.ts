export function focusDestination(index: number, size: number, key: string): number | null {
  const column = index % size;
  switch (key) {
    case 'ArrowLeft': return column === 0 ? index : index - 1;
    case 'ArrowRight': return column === size - 1 ? index : index + 1;
    case 'ArrowUp': return index < size ? index : index - size;
    case 'ArrowDown': return index >= size * (size - 1) ? index : index + size;
    default: return null;
  }
}
