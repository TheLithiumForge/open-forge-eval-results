import { useCallback, useRef, useState } from 'react';
import type { BoardSize } from '../boardCode.ts';
import { decodeSnapshot, encodeSnapshot } from '../snapshot.ts';
import { createGame, isWon } from '../state.ts';
import type { GameState } from '../state.ts';
import { activateCard } from '../transitions.ts';
import { turnAnnouncement } from './announcements.ts';
import { freshGame } from './seed.ts';
import type { Session } from './sessionTypes.ts';
import { readPreferences, savePreferences } from './storage.ts';
import { useActiveClock } from './useActiveClock.ts';

function initialSession(): Session {
  const preferences = readPreferences();
  return {
    game: freshGame(preferences.size), preferences, paused: false, dealId: 0,
    celebrate: false, announcement: { id: 0, text: '' }, loadStatus: '',
  };
}

export function useSession() {
  const [session, setSession] = useState(initialSession);
  const current = useRef(session);
  const publish = useCallback((next: Session) => {
    current.current = next;
    setSession(next);
  }, []);
  const clock = useActiveClock(current, publish, session.dealId);

  function announce(text: string, loadStatus = current.current.loadStatus) {
    const previous = current.current;
    publish({ ...previous, loadStatus, announcement: { id: previous.announcement.id + 1, text } });
  }

  function replace(game: GameState, paused = false) {
    clock.invalidate();
    const previous = current.current;
    const preferences = { ...previous.preferences, size: game.board.size };
    savePreferences(preferences);
    publish({
      ...previous, game, preferences, paused, dealId: previous.dealId + 1,
      celebrate: false, loadStatus: '',
    });
  }

  function activate(index: number) {
    clock.synchronize();
    const before = current.current;
    if (before.paused) return;
    const game = activateCard(before.game, index);
    if (game === before.game) return;
    let preferences = before.preferences;
    const won = isWon(game);
    if (won) {
      const best = preferences.bests[game.board.size];
      if (best === undefined || game.moves < best) {
        preferences = { ...preferences, bests: { ...preferences.bests, [game.board.size]: game.moves } };
        savePreferences(preferences);
      }
    }
    publish({ ...before, game, preferences, celebrate: won });
    const message = turnAnnouncement(before.game, game);
    if (message) announce(message);
  }

  function loadBoard(text: string): boolean {
    const game = createGame(text.trim());
    if (!game) { announce('Invalid board code.', 'Invalid board code.'); return false; }
    replace(game);
    return true;
  }

  function loadSnapshot(text: string): boolean {
    const game = decodeSnapshot(text);
    if (!game) { announce('Invalid snapshot.', 'Invalid snapshot.'); return false; }
    replace(game, !isWon(game));
    const message = isWon(game) ? 'Loaded completed snapshot.' : 'Loaded snapshot. Select Resume to continue.';
    announce(message, message);
    return true;
  }

  function exportSnapshot(): string {
    clock.synchronize();
    return encodeSnapshot(current.current.game);
  }

  return {
    ...session, activate, loadBoard, loadSnapshot, exportSnapshot,
    newGame: () => replace(freshGame(current.current.game.board.size, current.current.game.board.seed)),
    restart: () => {
      const game = createGame(current.current.game.board.code);
      if (game) replace(game);
    },
    changeSize: (size: BoardSize) => {
      if (size !== current.current.game.board.size) replace(freshGame(size, current.current.game.board.seed));
    },
    resume: () => { clock.synchronize(); publish({ ...current.current, paused: false }); },
  };
}
