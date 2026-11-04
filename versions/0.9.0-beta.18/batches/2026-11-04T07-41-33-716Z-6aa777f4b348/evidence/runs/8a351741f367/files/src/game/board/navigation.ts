export function focusDestination(index: number, size: number, key: string): number | null {
  switch (key) {
    case 'ArrowLeft': return index % size === 0 ? index : index - 1;
    case 'ArrowRight': return index % size === size - 1 ? index : index + 1;
    case 'ArrowUp': return index < size ? index : index - size;
    case 'ArrowDown': return index >= size * (size - 1) ? index : index + size;
    default: return null;
  }
}
