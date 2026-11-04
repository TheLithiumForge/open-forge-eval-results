export class ActiveClock {
  private lastNow: number;
  private fractionalMs = 0;

  public constructor(now: number) {
    this.lastNow = Number.isFinite(now) ? now : 0;
  }

  public elapsedWholeMilliseconds(now: number, active: boolean): number {
    const current = Number.isFinite(now) ? Math.max(this.lastNow, now) : this.lastNow;
    if (!active) {
      this.lastNow = current;
      return 0;
    }

    const elapsed = current - this.lastNow + this.fractionalMs;
    const wholeMilliseconds = Math.floor(elapsed);
    this.fractionalMs = elapsed - wholeMilliseconds;
    this.lastNow = current;
    return wholeMilliseconds;
  }

  public anchor(now: number): void {
    if (Number.isFinite(now)) this.lastNow = Math.max(this.lastNow, now);
  }

  public reset(now: number): void {
    this.fractionalMs = 0;
    this.anchor(now);
  }
}
