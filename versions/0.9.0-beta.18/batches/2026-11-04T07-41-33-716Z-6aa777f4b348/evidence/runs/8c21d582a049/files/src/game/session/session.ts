import { boardCode } from '../boardCode.ts';
import type { Size } from '../boardCode.ts';
import { decodeSnapshot, encodeSnapshot } from '../snapshot.ts';
import { activateCard, advanceGame, createGame, isWon, MAX_ELAPSED_MS } from '../state.ts';
import type { GameState } from '../state.ts';
import { SessionClock } from './clock.ts';
import { readPreferences, writePreferences } from './storage.ts';
import type { Preferences } from './storage.ts';
import { turnResult } from './turnResult.ts';
import type { SessionActions, SessionEnvironment, SessionView } from './sessionTypes.ts';

function requireGame(code: string): GameState {
  const game = createGame(code);
  if (!game) throw new Error('Invalid session board');
  return game;
}

export class GameSession implements SessionActions {
  private view: SessionView;
  private preferences: Preferences;
  private visible: boolean;
  private readonly environment: SessionEnvironment;
  private readonly clock: SessionClock;
  private listener: ((view: SessionView) => void) | null = null;

  constructor(environment: SessionEnvironment) {
    this.environment = environment;
    this.clock = new SessionClock(environment.now);
    this.visible = environment.visible;
    this.preferences = readPreferences(environment.storage);
    const game = requireGame(boardCode(this.preferences.size, environment.seed(0)));
    this.view = { game, paused: false, revision: 0, best: this.preferences.bests[game.board.size] ?? null,
      announcement: { id: 0, text: '' }, status: '', celebrate: false };
  }

  getView = (): SessionView => this.view;

  connect = (listener: (view: SessionView) => void): (() => void) => {
    this.listener = listener;
    listener(this.view);
    return () => { this.listener = null; };
  };

  private emit(): void { this.listener?.(this.view); }

  private settle(): void {
    const milliseconds = this.clock.take();
    if (!this.visible || this.view.paused) return;
    const game = advanceGame(this.view.game, milliseconds);
    if (game !== this.view.game) this.view = { ...this.view, game };
  }

  tick = (expectedRevision = this.view.revision): void => {
    if (expectedRevision !== this.view.revision) return;
    this.settle();
    this.emit();
  };

  setVisible = (visible: boolean): void => {
    this.settle();
    this.visible = visible;
    this.emit();
  };

  nextDelay = (): number => {
    const { game } = this.view;
    const toSecond = game.elapsedMs < MAX_ELAPSED_MS ? 1000 - (game.elapsedMs % 1000) : 1000;
    return Math.max(1, Math.min(toSecond, game.selection.kind === 'mismatch' ? game.selection.remainingMs : 1000));
  };

  private announce(text: string): void {
    this.view = { ...this.view, announcement: { id: this.view.announcement.id + 1, text } };
  }

  activate = (index: number): void => {
    this.settle();
    if (!this.view.paused && this.visible) {
      const before = this.view.game;
      const game = activateCard(before, index);
      this.view = { ...this.view, game };
      if (before.selection.kind === 'one' && game !== before) {
        this.announce(turnResult(game));
        if (isWon(game)) {
          const best = this.preferences.bests[game.board.size];
          if (best === undefined || game.moves < best) {
            this.preferences = { ...this.preferences, bests: { ...this.preferences.bests, [game.board.size]: game.moves } };
            writePreferences(this.environment.storage, this.preferences);
            this.view = { ...this.view, best: game.moves };
          }
          this.view = { ...this.view, celebrate: true };
        }
      }
    }
    this.emit();
  };

  private replace(game: GameState, paused: boolean, status = ''): void {
    this.clock.take();
    this.preferences = { ...this.preferences, size: game.board.size };
    writePreferences(this.environment.storage, this.preferences);
    this.view = { game, paused, revision: this.view.revision + 1, best: this.preferences.bests[game.board.size] ?? null,
      announcement: { id: this.view.announcement.id + 1, text: status }, status, celebrate: false };
    this.emit();
  }

  newGame = (): void => {
    const { size, seed } = this.view.game.board;
    this.replace(requireGame(boardCode(size, this.environment.seed(seed))), false);
  };

  restart = (): void => { this.replace(requireGame(this.view.game.board.code), false); };

  chooseSize = (size: Size): void => {
    if (size === this.view.game.board.size) return;
    this.replace(requireGame(boardCode(size, this.environment.seed(this.view.game.board.seed))), false);
  };

  private invalid(status: string): false {
    this.view = { ...this.view, status };
    this.announce(status);
    this.emit();
    return false;
  }

  loadBoard = (text: string): boolean => {
    const game = createGame(text.trim());
    if (!game) return this.invalid('Invalid board code.');
    this.replace(game, false, 'Loaded board.');
    return true;
  };

  loadSnapshot = (text: string): boolean => {
    const game = decodeSnapshot(text);
    if (!game) return this.invalid('Invalid snapshot.');
    const complete = isWon(game);
    this.replace(game, !complete, complete ? 'Loaded completed snapshot.' : 'Loaded snapshot. Select Resume to continue.');
    return true;
  };

  exportSnapshot = (): string => {
    this.settle();
    this.emit();
    return encodeSnapshot(this.view.game);
  };

  resume = (): void => {
    if (!this.view.paused) return;
    this.settle();
    this.view = { ...this.view, paused: false };
    this.emit();
  };
}
