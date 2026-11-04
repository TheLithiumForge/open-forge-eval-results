export const MOVEMENT_KEYS = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'] as const;
export type MovementKey = (typeof MOVEMENT_KEYS)[number];

export function isMovementKey(key: string): key is MovementKey {
  return MOVEMENT_KEYS.some((movement) => movement === key);
}

export function focusDestination(index: number, size: number, key: MovementKey): number {
  const row = Math.floor(index / size);
  const column = index % size;
  switch (key) {
    case 'ArrowLeft': return column > 0 ? index - 1 : index;
    case 'ArrowRight': return column < size - 1 ? index + 1 : index;
    case 'ArrowUp': return row > 0 ? index - size : index;
    case 'ArrowDown': return row < size - 1 ? index + size : index;
  }
}
