export function startMismatchTimer(delayMs: number, onElapsed: () => void): number {
  return window.setTimeout(onElapsed, Math.max(1, Math.ceil(delayMs)))
}

export function cancelMismatchTimer(timer: number | null): void {
  if (timer !== null) window.clearTimeout(timer)
}
