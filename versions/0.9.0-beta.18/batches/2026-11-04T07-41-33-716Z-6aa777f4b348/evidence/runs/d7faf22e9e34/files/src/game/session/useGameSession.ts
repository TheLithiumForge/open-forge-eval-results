import { useRef, useState } from 'react';
import type { SupportedSize } from '../boardCode.ts';
import { createGame, isWon } from '../state.ts';
import type { GameState } from '../state.ts';
import { activateCard } from '../transitions.ts';
import { decodeSnapshot, encodeSnapshot } from '../snapshot.ts';
import { accountActiveTime } from './activeTime.ts';
import { turnAnnouncement } from './announcements.ts';
import { freshGame } from './seed.ts';
import { announce, initialSession, replaceGame } from './sessionModel.ts';
import type { SessionModel } from './sessionModel.ts';
import { recordBest, writePreferences } from './storage.ts';
import { useSessionClock } from './useSessionClock.ts';

export function useGameSession() {
  const [view, setView] = useState(initialSession);
  const model = useRef(view);
  const clock = useRef({ atMs: performance.now(), visible: document.visibilityState !== 'hidden' });

  function commit(next: SessionModel): void {
    if (model.current === next) return;
    model.current = next;
    setView(next);
  }

  function synchronize(): GameState {
    const current = model.current;
    const accounted = accountActiveTime(current.game, clock.current, performance.now(), current.paused);
    clock.current = accounted.clock;
    if (accounted.game !== current.game) commit({ ...current, game: accounted.game });
    return accounted.game;
  }

  function replace(game: GameState, paused = false, status = ''): void {
    const next = replaceGame(model.current, game, paused, status);
    clock.current = { atMs: performance.now(), visible: document.visibilityState !== 'hidden' };
    commit(next);
    writePreferences(next.preferences);
  }

  function activate(index: number): void {
    const before = synchronize();
    if (model.current.paused) return;
    const after = activateCard(before, index);
    if (after === before) return;
    let next: SessionModel = { ...model.current, game: after };
    const text = turnAnnouncement(before, after);
    if (text) next = announce(next, text);
    if (isWon(after)) {
      const preferences = recordBest(next.preferences, after.board.size, after.moves);
      if (preferences !== next.preferences) writePreferences(preferences);
      next = { ...next, preferences, celebrate: true };
    }
    commit(next);
  }

  function changeSize(size: SupportedSize): void {
    if (size !== model.current.game.board.size) replace(freshGame(size, model.current.game.board.seed));
  }

  function newGame(): void {
    const current = model.current.game;
    replace(freshGame(current.board.size, current.board.seed));
  }

  function restart(): void {
    const game = createGame(model.current.game.board.boardCode);
    if (game) replace(game);
  }

  function loadFailure(text: string): false {
    commit(announce({ ...model.current, loadStatus: text }, text));
    return false;
  }

  function loadBoard(draft: string): boolean {
    const game = createGame(draft.trim());
    if (!game) return loadFailure('Invalid board code.');
    replace(game, false, 'Loaded board.');
    return true;
  }

  function loadSnapshot(draft: string): boolean {
    const game = decodeSnapshot(draft);
    if (!game) return loadFailure('Invalid snapshot.');
    const complete = isWon(game);
    replace(game, !complete, complete ? 'Loaded completed snapshot.' : 'Loaded snapshot. Select Resume to continue.');
    return true;
  }

  function exportSnapshot(): string { return encodeSnapshot(synchronize()); }

  function resume(): void {
    if (!model.current.paused) return;
    clock.current = { atMs: performance.now(), visible: document.visibilityState !== 'hidden' };
    commit({ ...model.current, paused: false });
  }

  useSessionClock(model, clock, synchronize, view.dealRevision, view.paused, view.game.selection.kind);
  return { game: view.game, dealRevision: view.dealRevision, paused: view.paused,
    best: view.preferences.bests[view.game.board.size] ?? null, celebrate: view.celebrate,
    announcement: view.announcement, loadStatus: view.loadStatus,
    activate, changeSize, newGame, restart, loadBoard, loadSnapshot, exportSnapshot, resume };
}
