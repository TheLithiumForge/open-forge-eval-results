import type { BoardSize } from '../boardCode.ts';
import { activateCard, advanceGame, createGame, isWon, selectionKinds } from '../state.ts';
import type { GameState } from '../state.ts';
import { decodeSnapshot, encodeSnapshot } from '../snapshot.ts';
import { formatTime } from './formatTime.ts';
import type { Preferences } from './storage.ts';

export interface Announcement { readonly id: number; readonly text: string }
export interface SessionView {
  readonly game: GameState;
  readonly revision: number;
  readonly paused: boolean;
  readonly best: number | null;
  readonly celebrate: boolean;
  readonly announcement: Announcement | null;
  readonly status: string;
}
export interface SessionEnvironment {
  readonly now: () => number;
  readonly fresh: (size: BoardSize, previousSeed?: number) => GameState;
  readonly read: () => Preferences;
  readonly save: (preferences: Preferences) => void;
}

// One controller belongs to one mounted React session; it has no global state.
export class SessionController {
  view: SessionView;
  private environment: SessionEnvironment;
  private preferences: Preferences;
  private lastTime: number;
  private visible: boolean;
  private eventId = 0;

  constructor(environment: SessionEnvironment, visible: boolean) {
    this.environment = environment;
    this.preferences = environment.read();
    const game = environment.fresh(this.preferences.size);
    this.view = { game, revision: 0, paused: false,
      best: this.preferences.best[game.board.size] ?? null,
      celebrate: false, announcement: null, status: '' };
    this.lastTime = environment.now();
    this.visible = visible;
  }

  get active(): boolean {
    return this.visible && !this.view.paused && this.view.game.started && !isWon(this.view.game);
  }

  get delay(): number {
    const selection = this.view.game.selection;
    return selection.kind === selectionKinds.mismatch ? Math.min(50, selection.remainingMs) : 50;
  }

  tick(): void {
    const now = this.environment.now();
    const delta = Math.max(0, now - this.lastTime);
    this.lastTime = now;
    if (this.visible && !this.view.paused) {
      const game = advanceGame(this.view.game, delta);
      if (game !== this.view.game) this.view = { ...this.view, game };
    }
  }

  setVisible(visible: boolean): void {
    this.tick();
    this.visible = visible;
  }

  private announce(text: string): void {
    this.view = { ...this.view, announcement: { id: ++this.eventId, text } };
  }

  private loadStatus(text: string): void {
    this.view = { ...this.view, status: text };
    this.announce(text);
  }

  private replace(game: GameState, paused = false): void {
    this.lastTime = this.environment.now();
    this.preferences = { ...this.preferences, size: game.board.size };
    this.environment.save(this.preferences);
    this.view = { game, revision: this.view.revision + 1, paused,
      best: this.preferences.best[game.board.size] ?? null,
      celebrate: false, announcement: null, status: '' };
  }

  activate(index: number): void {
    if (this.view.paused || !this.visible) return;
    this.tick();
    const before = this.view.game;
    const game = activateCard(before, index);
    if (game === before) return;
    this.view = { ...this.view, game };
    if (before.selection.kind !== selectionKinds.one) return;
    if (game.selection.kind === selectionKinds.mismatch) {
      this.announce('No match. Cards close after a short pause.');
    } else if (isWon(game)) {
      const previous = this.preferences.best[game.board.size];
      if (previous === undefined || game.moves < previous) {
        this.preferences = { ...this.preferences,
          best: { ...this.preferences.best, [game.board.size]: game.moves } };
        this.environment.save(this.preferences);
      }
      this.view = { ...this.view, celebrate: true,
        best: this.preferences.best[game.board.size] ?? null };
      this.announce(`Pair found. All pairs found in ${game.moves} moves and ${formatTime(game.elapsedMs)}.`);
    } else {
      const pairs = game.matched.length / 2;
      this.announce(`Pair found. ${pairs} ${pairs === 1 ? 'pair' : 'pairs'} matched.`);
    }
  }

  newGame(): void {
    this.replace(this.environment.fresh(this.view.game.board.size, this.view.game.board.seed));
  }

  restart(): void {
    const game = createGame(this.view.game.board.code);
    if (game) this.replace(game);
  }

  changeSize(size: BoardSize): void {
    if (size !== this.view.game.board.size) {
      this.replace(this.environment.fresh(size, this.view.game.board.seed));
    }
  }

  loadBoard(code: string): boolean {
    const game = createGame(code.trim());
    if (!game) { this.loadStatus('Invalid board code.'); return false; }
    this.replace(game);
    this.loadStatus('Loaded board.');
    return true;
  }

  loadSnapshot(text: string): boolean {
    const game = decodeSnapshot(text);
    if (!game) { this.loadStatus('Invalid snapshot.'); return false; }
    const completed = isWon(game);
    this.replace(game, !completed);
    this.loadStatus(completed ? 'Loaded completed snapshot.' : 'Loaded snapshot. Select Resume to continue.');
    return true;
  }

  exportSnapshot(): string {
    this.tick();
    return encodeSnapshot(this.view.game);
  }

  resume(): void {
    this.tick();
    this.view = { ...this.view, paused: false };
  }
}
