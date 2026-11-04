import { BOARD_SIZES } from '../board.ts';
import { activateCard } from '../transitions.ts';
import { createGame, isWon, type GameState } from '../state.ts';
import { readBestScores, readPreferences, writeBestScores, type BestScores } from './storage.ts';
import { ActiveClock } from './activeClock.ts';
import { validSeed, type SessionAnnouncement, type SessionEnvironment, type SessionView } from './environment.ts';
import { turnAnnouncement } from './turnAnnouncement.ts';

function boardCode(size: number, seed: number): string {
  return `np1-${size}-${seed}`;
}

const CELEBRATION_MS = 600;

export class SessionController {
  protected game: GameState;
  protected dealId = 0;
  protected paused = false;
  protected celebrating = false;
  protected status = '';
  protected announcement: SessionAnnouncement = Object.freeze({ serial: 0, text: '' });
  protected scores: BestScores;
  protected readonly environment: SessionEnvironment;
  protected readonly clock: ActiveClock;
  private readonly listeners = new Set<() => void>();
  private view: SessionView;
  private clearCelebration: (() => void) | null = null;

  constructor(environment: SessionEnvironment) {
    this.environment = environment;
    const size = readPreferences(environment.storage)?.size ?? BOARD_SIZES[0];
    const first = createGame(boardCode(size, validSeed(environment)));
    if (first === null) throw new Error('Initial supported board could not be created');
    this.game = first;
    this.scores = readBestScores(environment.storage);
    this.view = this.createView();
    this.clock = new ActiveClock(
      environment,
      () => this.game,
      () => this.dealId,
      () => this.paused,
      (game) => { this.game = game; this.publish(); },
    );
  }

  private createView(): SessionView {
    return Object.freeze({
      game: this.game,
      dealId: this.dealId,
      paused: this.paused,
      best: this.scores[this.game.board.size] ?? null,
      celebrating: this.celebrating,
      status: this.status,
      announcement: this.announcement,
    });
  }

  protected publish(): void {
    this.view = this.createView();
    for (const listener of this.listeners) listener();
  }

  readonly subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  readonly getSnapshot = (): SessionView => this.view;

  start(): void { this.clock.start(); }

  stop(): void {
    this.clock.stop();
    this.clearCelebration?.();
    this.clearCelebration = null;
  }

  protected beginDeal(game: GameState, paused: boolean, status = ''): void {
    this.clearCelebration?.();
    this.clearCelebration = null;
    this.celebrating = false;
    this.game = game;
    this.dealId += 1;
    this.paused = paused;
    this.status = status;
    this.clock.dealChanged();
    this.publish();
  }

  protected announce(text: string, status: string): void {
    this.status = status;
    this.announcement = Object.freeze({ serial: this.announcement.serial + 1, text });
    this.publish();
  }

  readonly activateCard = (index: number): void => {
    if (this.paused) return;
    this.clock.syncNow();
    const before = this.game;
    const after = activateCard(before, index);
    if (after === before) return;
    this.game = after;
    if (before.selection.kind === 'one') {
      const message = turnAnnouncement(before, after);
      if (message !== null) this.announce(message, '');
      if (!isWon(before) && isWon(after)) this.finishPlayedGame(after);
    }
    this.clock.gameChanged();
    this.publish();
  };

  private finishPlayedGame(game: GameState): void {
    const previousBest = this.scores[game.board.size];
    if (previousBest === undefined || game.moves < previousBest) {
      this.scores = Object.freeze({ ...this.scores, [game.board.size]: game.moves });
      writeBestScores(this.environment.storage, this.scores);
    }
    this.celebrating = true;
    const viewDealId = this.dealId;
    this.clearCelebration?.();
    this.clearCelebration = this.environment.setTimeout(() => {
      if (viewDealId !== this.dealId) return;
      this.clearCelebration = null;
      this.celebrating = false;
      this.publish();
    }, CELEBRATION_MS);
  }
}

