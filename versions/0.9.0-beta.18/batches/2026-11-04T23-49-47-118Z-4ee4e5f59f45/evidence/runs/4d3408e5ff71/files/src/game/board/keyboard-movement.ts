const BOARD_ARROW_KEYS = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'] as const;

export type BoardArrowKey = (typeof BOARD_ARROW_KEYS)[number];

export function isBoardArrowKey(key: string): key is BoardArrowKey {
  return BOARD_ARROW_KEYS.some((arrow) => arrow === key);
}

export function nextCardIndex(index: number, key: BoardArrowKey, size: number): number {
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
  }
}
