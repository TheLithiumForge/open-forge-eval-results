export const MISMATCH_DURATION_MS = 800;
export const MAX_ELAPSED_MS = 359_999_999;
export const MAX_MOVES = 999_999;

export function formatTime(milliseconds: number): string {
  const seconds = Math.floor(milliseconds / 1_000);
  const minutes = Math.floor(seconds / 60);
  return `${minutes}:${String(seconds % 60).padStart(2, "0")}`;
}
