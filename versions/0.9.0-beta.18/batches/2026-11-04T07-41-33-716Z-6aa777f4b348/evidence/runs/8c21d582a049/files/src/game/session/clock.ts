export class SessionClock {
  private previous: number;
  private readonly now: () => number;

  constructor(now: () => number) {
    this.now = now;
    this.previous = now();
  }

  take(): number {
    const current = this.now();
    const elapsed = Math.max(0, current - this.previous);
    this.previous = current;
    return elapsed;
  }
}
