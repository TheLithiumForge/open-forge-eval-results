import { MAX_SEED, isBoardSize } from '../board.ts';
import { decodeSnapshot, encodeSnapshot } from '../snapshot.ts';
import { createGame, isWon } from '../state.ts';
import { validSeed, type SessionEnvironment } from './environment.ts';
import { SessionController } from './controller.ts';
import { writePreferences } from './storage.ts';

function boardCode(size: number, seed: number): string {
  return `np1-${size}-${seed}`;
}

export class GameSession extends SessionController {
  constructor(environment: SessionEnvironment) {
    super(environment);
  }

  private nextSeed(): number {
    const seed = validSeed(this.environment);
    return seed === this.game.board.seed ? (seed % MAX_SEED) + 1 : seed;
  }

  readonly newGame = (): void => {
    const game = createGame(boardCode(this.game.board.size, this.nextSeed()));
    if (game !== null) this.beginDeal(game, false);
  };

  readonly restart = (): void => {
    const game = createGame(this.game.board.boardCode);
    if (game !== null) this.beginDeal(game, false);
  };

  readonly changeSize = (size: number): void => {
    if (!isBoardSize(size) || size === this.game.board.size) return;
    const game = createGame(boardCode(size, this.nextSeed()));
    if (game === null) return;
    writePreferences(this.environment.storage, size);
    this.beginDeal(game, false);
  };

  readonly loadBoard = (draft: string): boolean => {
    const game = createGame(draft.trim());
    if (game === null) {
      this.announce('Invalid board code.', 'Invalid board code.');
      return false;
    }
    writePreferences(this.environment.storage, game.board.size);
    this.announcement = Object.freeze({ serial: this.announcement.serial + 1, text: 'Loaded board.' });
    this.beginDeal(game, false, 'Loaded board.');
    return true;
  };

  readonly loadSnapshot = (draft: string): boolean => {
    const game = decodeSnapshot(draft);
    if (game === null) {
      this.announce('Invalid snapshot.', 'Invalid snapshot.');
      return false;
    }
    const completed = isWon(game);
    const status = completed ? 'Loaded completed snapshot.' : 'Loaded snapshot. Select Resume to continue.';
    writePreferences(this.environment.storage, game.board.size);
    this.announcement = Object.freeze({ serial: this.announcement.serial + 1, text: status });
    this.beginDeal(game, !completed, status);
    return true;
  };

  readonly exportSnapshot = (): string => {
    this.clock.syncNow();
    return encodeSnapshot(this.game);
  };

  readonly resume = (): void => {
    if (!this.paused) return;
    this.paused = false;
    this.clock.pauseChanged();
    this.publish();
  };
}
