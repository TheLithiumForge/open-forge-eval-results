export type MoveKey = 'ArrowLeft' | 'ArrowRight' | 'ArrowUp' | 'ArrowDown';

export function moveFocus(index: number, side: number, key: MoveKey): number {
  const row = Math.floor(index / side);
  const column = index % side;
  switch (key) {
    case 'ArrowLeft': return column === 0 ? index : index - 1;
    case 'ArrowRight': return column === side - 1 ? index : index + 1;
    case 'ArrowUp': return row === 0 ? index : index - side;
    case 'ArrowDown': return row === side - 1 ? index : index + side;
  }
}
