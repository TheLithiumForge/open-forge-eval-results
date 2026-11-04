export type ArrowDirection = "ArrowLeft" | "ArrowRight" | "ArrowUp" | "ArrowDown";

export function focusDestination(
  index: number,
  size: number,
  direction: ArrowDirection,
): number {
  const row = Math.floor(index / size);
  const column = index % size;

  if (direction === "ArrowLeft") return column === 0 ? index : index - 1;
  if (direction === "ArrowRight") return column === size - 1 ? index : index + 1;
  if (direction === "ArrowUp") return row === 0 ? index : index - size;
  return row === size - 1 ? index : index + size;
}
