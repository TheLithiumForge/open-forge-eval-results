import { useRef, useState } from 'react';
import { createGame } from '../game.ts';
import { parseBoardCode, isValidSize } from '../deck.ts';
import { decodeSnapshot, encodeSnapshot } from '../snapshot.ts';
import { freshBoardCode } from './fresh-board.ts';
import {
  activateSession,
  initialSession,
  replaceGame,
  SessionNotice,
  startCompetitionGame,
} from './session.ts';
import { readPreferences } from './storage.ts';
import { browserStore, useSavedPreferences } from './use-saved-preferences.ts';
import { useSessionClock } from './use-session-clock.ts';
import type { GameState } from '../game.ts';
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
    commit(replaceGame(current.current, createGame(current.current.game.boardCode), false));
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
    const game = decodeSnapshot(text);
    if (!game) {
      notice(SessionNotice.invalidSnapshot);
      return false;
    }
    clock.reset();
    commit(replaceGame(current.current, game, true));
    return true;
  }

  function exportSnapshot(): string {
    // Rendered state can trail the active clock by a tick.
    clock.synchronize();
    return encodeSnapshot(current.current.game);
  }

  // Returns the latest game, so a caller can see a completion in the same event.
  function activate(index: number): GameState {
    clock.synchronize();
    commit(activateSession(current.current, index));
    return current.current.game;
  }

  function startCompetition(code: string, feedback: string): void {
    clock.reset();
    commit(startCompetitionGame(current.current, createGame(code), feedback));
  }

  // Publishes status text, such as a tournament notice, through the game's live region.
  function announce(feedback: string): void {
    commit({ ...current.current, feedback, announcement: current.current.announcement + 1 });
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
    loadBoard,
    loadSnapshot,
    exportSnapshot,
    activate,
    resume,
    startCompetition,
    announce,
  };
}
