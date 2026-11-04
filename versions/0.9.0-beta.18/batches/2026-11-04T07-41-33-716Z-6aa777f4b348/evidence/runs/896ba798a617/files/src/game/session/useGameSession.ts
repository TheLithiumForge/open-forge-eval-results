import { useCallback, useRef, useState } from 'react';
import { activateCard } from '../activateCard.ts';
import { advanceGame } from '../advanceGame.ts';
import type { BoardSize } from '../boardCode.ts';
import { decodeSnapshot, encodeSnapshot } from '../snapshot.ts';
import { createGame, isWon } from '../state.ts';
import type { GameState } from '../state.ts';
import { newDeal } from './newDeal.ts';
import { readPreferences, writePreferences } from './storage.ts';
import type { Preferences } from './storage.ts';
import { turnAnnouncement } from './turnAnnouncement.ts';
import { useSessionClock } from './useSessionClock.ts';

type Announcement = Readonly<{ id: number; text: string }>;
type Session = Readonly<{
  game: GameState; dealId: number; paused: boolean; celebrate: boolean;
  preferences: Preferences; announcement: Announcement;
  boardStatus: string; snapshotStatus: string;
}>;
function initialSession(): Session {
  const preferences = readPreferences();
  return { game: newDeal(preferences.size), preferences, dealId: 0,
    paused: false, celebrate: false, announcement: { id: 0, text: '' }, boardStatus: '', snapshotStatus: '' };
}

export function useGameSession() {
  const [session, setSession] = useState(initialSession);
  const current = useRef(session);
  const anchor = useRef(performance.now());
  const visible = useRef(document.visibilityState !== 'hidden');
  const commit = useCallback((next: Session) => {
    current.current = next;
    setSession(next);
  }, []);
  const settle = useCallback((expectedDeal?: number) => {
    const before = current.current;
    if (expectedDeal !== undefined && expectedDeal !== before.dealId) return;
    const now = performance.now();
    const elapsed = now - anchor.current;
    anchor.current = now;
    if (before.paused || !visible.current) return;
    const game = advanceGame(before.game, elapsed);
    if (game !== before.game) commit({ ...before, game });
  }, [commit]);
  const setVisible = useCallback((shown: boolean) => { visible.current = shown; }, []);
  const delay = useCallback(() => {
    const selection = current.current.game.selection;
    return selection.kind === 'mismatch' ? Math.min(100, selection.remainingMs) : 100;
  }, []);
  useSessionClock({ dealId: session.dealId, running: session.game.started
    && !session.paused && !isWon(session.game), settle, setVisible, delay });

  function announce(text: string): Announcement {
    return { id: current.current.announcement.id + 1, text };
  }
  function replace(game: GameState, paused = false, message = '', source?: 'board' | 'snapshot') {
    const before = current.current;
    anchor.current = performance.now();
    const preferences = { ...before.preferences, size: game.board.size };
    writePreferences(preferences);
    commit({ ...before, game, preferences, dealId: before.dealId + 1,
      paused, celebrate: false, announcement: announce(message),
      boardStatus: source === 'board' ? message : '', snapshotStatus: source === 'snapshot' ? message : '' });
  }
  function activate(index: number) {
    settle();
    const before = current.current;
    if (before.paused) return;
    const game = activateCard(before.game, index);
    if (game === before.game) return;
    const message = turnAnnouncement(before.game, game);
    let preferences = before.preferences;
    const won = isWon(game);
    if (won) {
      const previous = preferences.best[game.board.size];
      if (previous === undefined || game.moves < previous) {
        preferences = { ...preferences, best: { ...preferences.best, [game.board.size]: game.moves } };
        writePreferences(preferences);
      }
    }
    commit({ ...before, game, preferences, celebrate: won,
      announcement: message ? announce(message) : before.announcement });
  }
  function loadBoard(draft: string): string {
    const game = createGame(draft.trim());
    if (!game) {
      commit({ ...current.current, boardStatus: 'Invalid board code.', announcement: announce('Invalid board code.') });
      return 'Invalid board code.';
    }
    replace(game, false, 'Loaded board.', 'board');
    return 'Loaded board.';
  }
  function loadSnapshot(draft: string): string {
    const game = decodeSnapshot(draft);
    if (!game) {
      commit({ ...current.current, snapshotStatus: 'Invalid snapshot.', announcement: announce('Invalid snapshot.') });
      return 'Invalid snapshot.';
    }
    const message = isWon(game) ? 'Loaded completed snapshot.' : 'Loaded snapshot. Select Resume to continue.';
    replace(game, !isWon(game), message, 'snapshot');
    return message;
  }
  function exportSnapshot(): string {
    settle();
    return encodeSnapshot(current.current.game);
  }
  function resume() {
    anchor.current = performance.now();
    commit({ ...current.current, paused: false, snapshotStatus: '' });
  }
  function restart() {
    const game = createGame(current.current.game.board.code);
    if (game) replace(game);
  }
  function startNew(size: BoardSize = current.current.game.board.size) {
    replace(newDeal(size, current.current.game.board.code));
  }
  return { ...session, activate, loadBoard, loadSnapshot, exportSnapshot, resume, restart, startNew };
}
