import { isBoardSize, type BoardSize } from "../board/sizes.ts";
import { advanceGame } from "../clock.ts";
import { boardCode, gameFor, randomSeed, startNow } from "./board.ts";
import { ActiveClock } from "./active-clock.ts";
import { createGame } from "../create.ts";
import { decodeSnapshot, encodeSnapshot } from "../snapshot.ts";
import { activateCard } from "../transition.ts";
import { isWon, type GameState } from "../state.ts";
import { describeTurn } from "./turn.ts";
import type { GameSessionView, SessionAnnouncement, SessionOptions } from "./types.ts";
import { createSessionView } from "./view.ts";
import { PreferenceStore } from "./storage.ts";

export class GameSession {
  private readonly clock: () => number;
  private readonly seedSource: () => number;
  private readonly saved: PreferenceStore;
  private game: GameState;
  private paused = false;
  private visible = true;
  private dealRevision = 0;
  private celebrationId = 0;
  private announcementId = 0;
  private announcement: SessionAnnouncement | null = null;
  private status = "";
  private readonly activeClock: ActiveClock;
  private view: GameSessionView;
  private readonly listeners = new Set<(view: GameSessionView) => void>();

  public constructor(options: SessionOptions = {}) {
    this.clock = options.now ?? (() => performance.now());
    this.seedSource = options.seedSource ?? randomSeed;
    this.saved = new PreferenceStore(options.storage);
    this.game = gameFor(boardCode(this.saved.size, this.seedSource));
    this.activeClock = new ActiveClock(startNow(this.clock));
    this.view = this.makeView();
  }

  public getSnapshot = (): GameSessionView => this.view;

  public subscribe = (listener: (view: GameSessionView) => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  public shouldTick(): boolean {
    return this.visible && !this.paused && this.game.started && !isWon(this.game);
  }

  public activateCard(index: number): void {
    this.syncAt(this.clock());
    if (this.paused || !this.visible) return;

    const before = this.game;
    const after = activateCard(before, index);
    if (after === before) return;
    this.game = after;

    if (before.selection.kind === "one") {
      const result = describeTurn(before, after);
      if (result !== null) {
        if (result.won) {
          this.celebrationId += 1;
          this.saved.recordWin(after.board.size, after.moves);
        }
        this.announcementId += 1;
        this.announcement = { id: this.announcementId, text: result.message };
      }
    }
    this.publish();
  }

  public newGame(): void {
    this.replaceGame(boardCode(this.game.board.size, this.seedSource, this.game.board.code));
  }

  public restart(): void {
    this.replaceGame(this.game.board.code);
  }

  public changeSize(value: number): void {
    if (!isBoardSize(value) || value === this.game.board.size) return;
    this.replaceGame(boardCode(value, this.seedSource, this.game.board.code));
    this.saved.rememberSize(value);
  }

  public loadBoard(draft: string): void {
    const code = draft.trim();
    const game = createGame(code);
    if (game === null) {
      this.setStatus("Invalid board code.");
      return;
    }
    this.replaceGame(code);
    this.saved.rememberSize(game.board.size);
  }

  public exportSnapshot(): string {
    this.syncAt(this.clock());
    return encodeSnapshot(this.game);
  }

  public loadSnapshot(text: string): void {
    const game = decodeSnapshot(text);
    if (game === null) {
      this.setStatus("Invalid snapshot.");
      return;
    }

    this.replaceGame(game.board.code, game, !isWon(game));
    this.saved.rememberSize(game.board.size);
    this.setStatus(isWon(game)
      ? "Loaded completed snapshot."
      : "Loaded snapshot. Select Resume to continue.");
  }

  public resume(): void {
    if (!this.paused || isWon(this.game)) return;
    this.syncAnchor(this.clock());
    this.paused = false;
    this.publish();
  }

  public setVisible(visible: boolean, now: number): void {
    if (this.visible === visible) return;
    this.syncAt(now);
    this.visible = visible;
    this.syncAnchor(now);
    this.publish();
  }

  public tick(now: number): void {
    this.syncAt(now);
  }

  private syncAt(now: number): void {
    const wholeMilliseconds = this.activeClock.elapsedWholeMilliseconds(now, this.shouldTick());
    if (wholeMilliseconds <= 0) return;

    const before = this.game;
    const after = advanceGame(before, wholeMilliseconds);
    if (after.elapsedMs === before.elapsedMs && after.selection === before.selection) return;
    this.game = after;
    this.publish();
  }

  private syncAnchor(now: number): void {
    this.activeClock.anchor(now);
  }

  private replaceGame(code: string, game = gameFor(code), paused = false): void {
    this.syncAnchor(this.clock());
    this.game = game;
    this.paused = paused;
    this.activeClock.reset(this.clock());
    this.dealRevision += 1;
    this.celebrationId = 0;
    this.announcement = null;
    this.status = "";
    this.publish();
  }

  private setStatus(status: string): void {
    this.status = status;
    this.announcementId += 1;
    this.announcement = { id: this.announcementId, text: status };
    this.publish();
  }

  private makeView(): GameSessionView {
    return createSessionView(
      this.game,
      this.game.board.size,
      this.saved.bestFor(this.game.board.size),
      this.dealRevision,
      this.paused,
      this.visible,
      this.celebrationId,
      this.announcement,
      this.status,
    );
  }

  private publish(): void {
    this.view = this.makeView();
    for (const listener of this.listeners) listener(this.view);
  }
}
