import { useCallback, useRef, useState } from 'react';
import type { GridSize } from '../board-code.ts';
import { createGame } from '../create-game.ts';
import { encodeSnapshot } from '../snapshot.ts';
import { advanceSession, resumeSession } from './active-time.ts';
import { freshGame } from './fresh-game.ts';
import { playCard } from './play-card.ts';
import { loadBoard as loadBoardSession, loadSnapshot as loadSnapshotSession, replaceGame } from './replace-game.ts';
import { initialSession } from './session-state.ts';
import type { SessionState } from './session-state.ts';
import { readPreferences, writePreferences } from './storage.ts';
import { useSessionClock } from './use-session-clock.ts';

export function useGameSession() {
  const [session, setSession] = useState(() => {
    const preferences = readPreferences();
    return initialSession(freshGame(preferences.size), preferences, performance.now(), document.visibilityState === 'visible');
  });
  const current = useRef(session);
  const commit = useCallback((next: SessionState) => {
    const previous = current.current;
    current.current = next;
    setSession(next);
    if (previous.preferences !== next.preferences) writePreferences(next.preferences);
  }, []);
  useSessionClock(session, current, commit);

  function newGame() {
    const previous = current.current;
    commit(replaceGame(previous, freshGame(previous.game.board.size, previous.game.board.seed), performance.now()));
  }
  function restart() {
    const previous = current.current;
    const game = createGame(previous.game.board.code);
    if (game !== null) commit(replaceGame(previous, game, performance.now()));
  }
  function changeSize(size: GridSize) {
    const previous = current.current;
    if (size !== previous.game.board.size) {
      commit(replaceGame(previous, freshGame(size, previous.game.board.seed), performance.now()));
    }
  }
  function loadBoard(text: string): boolean {
    const previous = current.current;
    const next = loadBoardSession(previous, text, performance.now());
    commit(next);
    return next.dealId !== previous.dealId;
  }
  function loadSnapshot(text: string): boolean {
    const previous = current.current;
    const next = loadSnapshotSession(previous, text, performance.now());
    commit(next);
    return next.dealId !== previous.dealId;
  }
  function exportSnapshot(): string {
    const next = advanceSession(current.current, performance.now());
    commit(next);
    return encodeSnapshot(next.game);
  }

  return {
    game: session.game, dealId: session.dealId, paused: session.paused,
    best: session.preferences.bests[session.game.board.size] ?? null,
    celebrate: session.celebrate, announcement: session.announcement, loadStatus: session.loadStatus,
    activate: (index: number) => commit(playCard(current.current, index, performance.now())),
    newGame, restart, changeSize, loadBoard, loadSnapshot, exportSnapshot,
    resume: () => commit(resumeSession(current.current, performance.now())),
  };
}

export type GameSession = ReturnType<typeof useGameSession>;
