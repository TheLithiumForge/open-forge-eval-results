export interface ClockEnvironment {
  now(): number;
  request(callback: () => void): number;
  cancel(id: number): void;
}

// A generation token also rejects callbacks already queued when cancel runs.
export function createActiveClock(environment: ClockEnvironment, advance: (ms: number) => void) {
  let running = false;
  let last = 0;
  let pending: number | null = null;
  let generation = 0;
  function flush() {
    if (!running) return;
    const now = environment.now();
    const delta = Math.max(0, now - last);
    last = now;
    if (delta > 0) advance(delta);
  }
  function schedule() {
    const token = generation;
    pending = environment.request(() => {
      if (token !== generation || !running) return;
      pending = null;
      flush();
      schedule();
    });
  }
  function setRunning(next: boolean) {
    flush();
    if (running === next) return;
    running = next;
    generation++;
    if (pending !== null) environment.cancel(pending);
    pending = null;
    if (running) { last = environment.now(); schedule(); }
  }
  function reset() {
    setRunning(false);
    generation++;
  }
  return { flush, setRunning, reset };
}
