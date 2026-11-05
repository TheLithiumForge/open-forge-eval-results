import { useRef, useState } from 'react';
import { createGame } from '../game.ts';
import { parseBoardCode, isValidSize } from '../deck.ts';
import { decodeSnapshot, encodeSnapshot } from '../snapshot.ts';
import { freshBoardCode } from './fresh-board.ts';
import { activateSession, initialSession, replaceGame, SessionNotice } from './session.ts';
import { DEFAULT_SIZE, readPreferences } from './storage.ts';
import { browserStore, useSavedPreferences } from './use-saved-preferences.ts';
import { useSessionClock } from './use-session-clock.ts';
import type { Session } from './session.ts';

interface GameOptions {
  readonly active?: boolean;
  readonly persistPreferences?: boolean;
  readonly recordBest?: boolean;
  readonly initialSize?: number;
}

export function useGame(options: GameOptions = {}) {
  const active = options.active ?? true;
  const persistPreferences = options.persistPreferences ?? true;
  const recordBest = options.recordBest ?? true;
  const [store] = useState(() => (persistPreferences ? browserStore() : null));
  const [session, setSession] = useState(() => {
    const preferences = persistPreferences
      ? readPreferences(store)
      : { size: options.initialSize ?? DEFAULT_SIZE, bestMoves: {} };
    return initialSession(freshBoardCode(options.initialSize ?? preferences.size), preferences);
  });
  const current = useRef(session);

  function commit(next: Session): void {
    if (next === current.current) return;
    current.current = next;
    setSession(next);
  }

  const clock = useSessionClock(session, current, commit, active);
  useSavedPreferences(store, session.preferences, persistPreferences);

  function newGame(size = current.current.game.size): void {
    if (!isValidSize(size)) return;
    const next = createGame(freshBoardCode(size, current.current.game.seed));
    clock.reset();
    commit(replaceGame(current.current, next, false, persistPreferences));
  }

  function restart(): void {
    clock.reset();
    commit(
      replaceGame(
        current.current,
        createGame(current.current.game.boardCode),
        false,
        persistPreferences,
      ),
    );
  }

  function notice(feedback: string): void {
    commit({
      ...current.current,
      feedback,
      loadNotice: feedback,
      announcement: current.current.announcement + 1,
    });
  }

  function loadBoard(code: string): boolean {
    code = code.trim();
    if (!parseBoardCode(code)) {
      notice(SessionNotice.invalidBoard);
      return false;
    }
    clock.reset();
    commit(replaceGame(current.current, createGame(code), false, persistPreferences));
    return true;
  }

  function loadSnapshot(text: string): boolean {
    const game = decodeSnapshot(text);
    if (!game) {
      notice(SessionNotice.invalidSnapshot);
      return false;
    }
    clock.reset();
    commit(replaceGame(current.current, game, true, persistPreferences));
    return true;
  }

  function exportSnapshot(): string {
    // Rendered state can trail the active clock by a tick.
    clock.synchronize();
    return encodeSnapshot(current.current.game);
  }

  function activate(index: number): void {
    clock.synchronize();
    commit(activateSession(current.current, index, recordBest));
  }

  function resume(): void {
    clock.reset();
    commit({
      ...current.current,
      paused: false,
      feedback: '',
      loadNotice: '',
    });
  }

  return { session, newGame, restart, loadBoard, loadSnapshot, exportSnapshot, activate, resume };
}
