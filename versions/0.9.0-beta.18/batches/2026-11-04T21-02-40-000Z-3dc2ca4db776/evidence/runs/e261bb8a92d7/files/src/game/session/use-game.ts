import { useRef, useState } from 'react';
import { createGame } from '../game.ts';
import { parseBoardCode, isValidSize } from '../deck.ts';
import { encodeSnapshot, readSnapshot } from '../snapshot.ts';
import { freshBoardCode } from './fresh-board.ts';
import { activateSession, initialSession, replaceGame, SessionNotice } from './session.ts';
import { readPreferences } from './storage.ts';
import { browserStore, useSavedPreferences } from './use-saved-preferences.ts';
import { useSessionClock } from './use-session-clock.ts';
import type { Session } from './session.ts';

export function useGame() {
  const [store] = useState(browserStore);
  const [session, setSession] = useState(() => {
    const preferences = readPreferences(store);
    return initialSession(freshBoardCode(preferences.size), preferences);
  });
  const current = useRef(session);

  function commit(next: Session): void {
    if (next === current.current) return;
    current.current = next;
    setSession(next);
  }

  const clock = useSessionClock(session, current, commit);
  useSavedPreferences(store, session.preferences);

  function newGame(size = current.current.game.size): void {
    if (!isValidSize(size)) return;
    const next = createGame(freshBoardCode(size, current.current.game.seed));
    clock.reset();
    commit(replaceGame(current.current, next, false));
  }

  function restart(): void {
    clock.reset();
    const { game, name } = current.current;
    commit(replaceGame(current.current, createGame(game.boardCode), false, name));
  }

  function rename(name: string): void {
    commit({ ...current.current, name });
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
    commit(replaceGame(current.current, createGame(code), false));
    return true;
  }

  function loadSnapshot(text: string): boolean {
    const saved = readSnapshot(text);
    if (!saved) {
      notice(SessionNotice.invalidSnapshot);
      return false;
    }
    clock.reset();
    commit(replaceGame(current.current, saved.game, true, saved.name));
    return true;
  }

  function exportSnapshot(): string {
    // Rendered state can trail the active clock by a tick.
    clock.synchronize();
    return encodeSnapshot(current.current.game, current.current.name);
  }

  function activate(index: number): void {
    clock.synchronize();
    commit(activateSession(current.current, index));
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

  return {
    session,
    newGame,
    restart,
    rename,
    loadBoard,
    loadSnapshot,
    exportSnapshot,
    activate,
    resume,
  };
}
