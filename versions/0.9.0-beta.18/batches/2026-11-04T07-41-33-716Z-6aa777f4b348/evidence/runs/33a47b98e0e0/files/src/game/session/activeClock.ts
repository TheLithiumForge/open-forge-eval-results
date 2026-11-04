import { advanceGame } from '../transitions.ts';
import type { GameState } from '../state.ts';
import type { SessionEnvironment } from './environment.ts';

export class ActiveClock {
  private running = false;
  private visible = true;
  private lastAt = 0;
  private loopGeneration = 0;
  private deadlineGeneration = 0;
  private clearPulse: (() => void) | null = null;
  private clearDeadline: (() => void) | null = null;
  private removeVisibility: (() => void) | null = null;
  private readonly environment: SessionEnvironment;
  private readonly readGame: () => GameState;
  private readonly readDealId: () => number;
  private readonly readPaused: () => boolean;
  private readonly writeGame: (game: GameState) => void;

  constructor(
    environment: SessionEnvironment,
    readGame: () => GameState,
    readDealId: () => number,
    readPaused: () => boolean,
    writeGame: (game: GameState) => void,
  ) {
    this.environment = environment;
    this.readGame = readGame;
    this.readDealId = readDealId;
    this.readPaused = readPaused;
    this.writeGame = writeGame;
  }

  start(): void {
    if (this.running) return;
    this.running = true;
    this.visible = this.environment.isVisible();
    this.lastAt = this.environment.now();
    this.removeVisibility = this.environment.onVisibilityChange(() => this.visibilityChanged());
    this.installPulse();
    this.scheduleDeadline();
  }

  stop(): void {
    this.running = false;
    this.loopGeneration += 1;
    this.deadlineGeneration += 1;
    this.clearPulse?.();
    this.clearPulse = null;
    this.clearDeadline?.();
    this.clearDeadline = null;
    this.removeVisibility?.();
    this.removeVisibility = null;
  }

  syncNow(): void {
    this.syncAt(this.environment.now());
  }

  gameChanged(): void {
    this.scheduleDeadline();
  }

  dealChanged(): void {
    this.lastAt = this.environment.now();
    this.cancelDeadline();
    this.installPulse();
    this.scheduleDeadline();
  }

  pauseChanged(): void {
    this.lastAt = this.environment.now();
    this.scheduleDeadline();
  }

  private installPulse(): void {
    this.clearPulse?.();
    this.clearPulse = null;
    this.loopGeneration += 1;
    if (!this.running) return;
    const generation = this.loopGeneration;
    this.clearPulse = this.environment.setInterval(() => {
      if (generation !== this.loopGeneration || !this.visible) return;
      this.syncNow();
    }, 100);
  }

  private syncAt(now: number): void {
    const delta = Math.max(0, now - this.lastAt);
    this.lastAt = now;
    if (!this.running || !this.visible || this.readPaused() || delta === 0) return;
    const previous = this.readGame();
    const next = advanceGame(previous, delta);
    if (next.elapsedMs === previous.elapsedMs && next.selection === previous.selection) return;
    this.writeGame(next);
    if (next.selection !== previous.selection) this.scheduleDeadline();
  }

  private visibilityChanged(): void {
    const visible = this.environment.isVisible();
    if (visible === this.visible) return;
    if (this.visible) this.syncAt(this.environment.now());
    this.visible = visible;
    this.lastAt = this.environment.now();
    if (visible) this.scheduleDeadline();
    else this.cancelDeadline();
  }

  private cancelDeadline(): void {
    this.deadlineGeneration += 1;
    this.clearDeadline?.();
    this.clearDeadline = null;
  }

  private scheduleDeadline(): void {
    this.cancelDeadline();
    if (!this.running || !this.visible || this.readPaused()) return;
    const selection = this.readGame().selection;
    if (selection.kind !== 'mismatch') return;
    const generation = this.deadlineGeneration;
    const dealId = this.readDealId();
    const timeSinceSync = Math.max(0, this.environment.now() - this.lastAt);
    const delay = Math.max(0, selection.remainingMs - timeSinceSync);
    this.clearDeadline = this.environment.setTimeout(() => {
      if (generation !== this.deadlineGeneration || dealId !== this.readDealId()) return;
      if (this.readGame().selection !== selection) return;
      this.clearDeadline = null;
      this.syncNow();
      this.scheduleDeadline();
    }, delay);
  }
}

