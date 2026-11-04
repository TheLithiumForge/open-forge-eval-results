export type BoardArrow = 'ArrowLeft' | 'ArrowRight' | 'ArrowUp' | 'ArrowDown';

export function nextBoardFocus(index: number, size: number, key: string): number | null {
  if (!Number.isSafeInteger(index) || !Number.isSafeInteger(size) || index < 0 || index >= size * size) return null;
  const row = Math.floor(index / size);
  const column = index % size;
  switch (key) {
    case 'ArrowLeft':
      return column === 0 ? index : index - 1;
    case 'ArrowRight':
      return column === size - 1 ? index : index + 1;
    case 'ArrowUp':
      return row === 0 ? index : index - size;
    case 'ArrowDown':
      return row === size - 1 ? index : index + size;
    default:
      return null;
  }
}
