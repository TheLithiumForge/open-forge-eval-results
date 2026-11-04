import { activateCard } from '../activateCard.ts';
import { advanceGame } from '../advanceGame.ts';
import type { Side } from '../boardCode.ts';
import { decodeSnapshot, encodeSnapshot } from '../snapshot.ts';
import { createGame, isWon } from '../state.ts';
import type { GameState } from '../state.ts';
import { createActiveClock } from './activeClock.ts';
import { turnAnnouncement } from './announcements.ts';
import type { ClockPorts, SessionView } from './model.ts';
import type { Preferences } from './storage.ts';

export interface SessionPorts extends ClockPorts {
  readonly seed: (previous?: number) => number;
  readonly save: (preferences: Preferences) => void;
}

export function createSession(ports: SessionPorts, initialPreferences: Preferences) {
  let preferences = initialPreferences;
  const initial = createGame(`np1-${preferences.size}-${ports.seed()}`);
  if (!initial) throw new Error('Could not create the initial deal.');
  let view: SessionView = {
    game: initial, paused: false, celebrate: false, revision: 0,
    best: preferences.best[preferences.size] ?? null, announcement: null, loadStatus: '',
  };
  let emit: (next: SessionView) => void = () => {};
  let announcementId = 0;
  const publish = (next: SessionView): void => { view = next; emit(view); };
  const clock = createActiveClock(ports, (milliseconds) => {
    if (view.paused) return;
    const game = advanceGame(view.game, milliseconds);
    if (game !== view.game) publish({ ...view, game });
  }, () => {
    if (view.paused || !view.game.started || isWon(view.game)) return null;
    return view.game.selection.kind === 'mismatch'
      ? Math.min(100, view.game.selection.remainingMs) : 100;
  });

  function status(text: string): void {
    publish({ ...view, loadStatus: text, announcement: { id: ++announcementId, text } });
  }

  function replace(game: GameState, paused = false, text = ''): void {
    preferences = { ...preferences, size: game.board.size };
    ports.save(preferences);
    publish({
      game, paused, celebrate: false, revision: view.revision + 1,
      best: preferences.best[game.board.size] ?? null, loadStatus: text,
      announcement: text ? { id: ++announcementId, text } : null,
    });
    clock.reset();
  }

  function newDeal(size: Side): void {
    const game = createGame(`np1-${size}-${ports.seed(view.game.board.seed)}`);
    if (game) replace(game);
  }

  function activate(index: number): void {
    clock.sample();
    if (view.paused) return;
    const before = view.game;
    const game = activateCard(before, index);
    if (game === before) { clock.refresh(); return; }
    const text = turnAnnouncement(before, game);
    const won = isWon(game);
    if (won && (view.best === null || game.moves < view.best)) {
      preferences = { ...preferences, best: { ...preferences.best, [game.board.size]: game.moves } };
      ports.save(preferences);
    }
    publish({
      ...view, game, celebrate: won, best: preferences.best[game.board.size] ?? null,
      announcement: text ? { id: ++announcementId, text } : view.announcement,
    });
    clock.refresh();
  }

  function loadBoard(text: string): boolean {
    const game = createGame(text.trim());
    if (!game) { status('Invalid board code.'); return false; }
    replace(game, false, 'Loaded board.');
    return true;
  }

  function loadSnapshot(text: string): boolean {
    const game = decodeSnapshot(text);
    if (!game) { status('Invalid snapshot.'); return false; }
    const won = isWon(game);
    replace(game, !won, won ? 'Loaded completed snapshot.' : 'Loaded snapshot. Select Resume to continue.');
    return true;
  }

  function resume(): void {
    if (!view.paused) return;
    publish({ ...view, paused: false, loadStatus: '' });
    clock.reset();
  }

  return {
    getView: (): SessionView => view,
    connect(listener: (next: SessionView) => void): () => void {
      emit = listener;
      const disconnect = clock.connect();
      emit(view);
      return () => { emit = () => {}; disconnect(); };
    },
    activate,
    newGame: (): void => newDeal(view.game.board.size),
    restart(): void {
      const game = createGame(view.game.board.code);
      if (game) replace(game);
    },
    chooseSize(size: Side): void { if (size !== view.game.board.size) newDeal(size); },
    loadBoard,
    loadSnapshot,
    exportSnapshot(): string { clock.sample(); return encodeSnapshot(view.game); },
    resume,
  };
}
