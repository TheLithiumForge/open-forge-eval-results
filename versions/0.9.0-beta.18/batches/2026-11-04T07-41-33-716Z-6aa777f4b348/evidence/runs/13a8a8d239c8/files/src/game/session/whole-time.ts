export interface MillisecondChunk {
  readonly wholeMilliseconds: number;
  readonly remainder: number;
}

export function accumulateMilliseconds(delta: number, remainder: number): MillisecondChunk {
  const total = Math.max(0, delta) + Math.max(0, remainder);
  if (!Number.isFinite(total) || total >= Number.MAX_SAFE_INTEGER) {
    return { wholeMilliseconds: Number.MAX_SAFE_INTEGER, remainder: 0 };
  }
  const wholeMilliseconds = Math.floor(total);
  return { wholeMilliseconds, remainder: total - wholeMilliseconds };
}
