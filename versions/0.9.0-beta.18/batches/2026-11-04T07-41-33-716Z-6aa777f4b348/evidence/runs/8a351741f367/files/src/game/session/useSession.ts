import { useCallback, useRef, useState } from 'react';
import type { Size } from '../boardCode.ts';
import { createGame, isWon } from '../state.ts';
import type { GameState } from '../state.ts';
import { activateCard, advanceGame } from '../transitions.ts';
import { decodeSnapshot, encodeSnapshot } from '../snapshot.ts';
import { turnAnnouncement } from './announcements.ts';
import type { Announcement } from './announcements.ts';
import { freshGame } from './freshGame.ts';
import { readPreferences, recordBest, writePreferences } from './storage.ts';
import type { Preferences } from './storage.ts';
import { useActiveClock } from './useActiveClock.ts';

interface Session {
  readonly game: GameState;
  readonly preferences: Preferences;
  readonly paused: boolean;
  readonly epoch: number;
  readonly celebrate: boolean;
  readonly announcement: Announcement;
  readonly loadStatus: string;
}

function initialSession(): Session {
  const preferences = readPreferences();
  return { game: freshGame(preferences.size), preferences, paused: false, epoch: 0,
    celebrate: false, announcement: { id: 0, text: '' }, loadStatus: '' };
}

export function useSession() {
  const [session, setSession] = useState(initialSession);
  const current = useRef(session);
  const lastTime = useRef(performance.now());
  const visible = useRef(!document.hidden);
  const publish = useCallback((next: Session): void => {
    current.current = next;
    setSession(next);
  }, []);
  const settle = useCallback((now: number): GameState => {
    const before = current.current;
    const checkpoint = Math.max(lastTime.current, now);
    const delta = checkpoint - lastTime.current;
    lastTime.current = checkpoint;
    return visible.current && !before.paused ? advanceGame(before.game, delta) : before.game;
  }, []);
  const onTime = useCallback((now: number, epoch: number): void => {
    if (current.current.epoch !== epoch) return;
    const game = settle(now);
    if (game !== current.current.game) publish({ ...current.current, game });
  }, [publish, settle]);
  const onVisibility = useCallback((shown: boolean, epoch: number): void => {
    if (current.current.epoch !== epoch) return;
    visible.current = shown;
    lastTime.current = performance.now();
  }, []);
  useActiveClock(session.epoch, onTime, onVisibility);

  const replace = (game: GameState, paused = false, loadStatus = ''): void => {
    const before = current.current;
    const preferences = { ...before.preferences, size: game.board.size };
    writePreferences(preferences);
    lastTime.current = performance.now();
    publish({ game, preferences, paused, epoch: before.epoch + 1, celebrate: false, loadStatus,
      announcement: { id: before.announcement.id + 1, text: loadStatus } });
  };
  const activate = (index: number): void => {
    const before = current.current;
    const game = settle(performance.now());
    if (before.paused || !visible.current) return;
    const next = activateCard(game, index);
    const turn = game.selection.kind === 'one' && next !== game;
    const won = turn && isWon(next);
    publish({ ...before, game: next, celebrate: before.celebrate || won,
      preferences: won ? recordBest(before.preferences, next.board.size, next.moves) : before.preferences,
      announcement: turn ? { id: before.announcement.id + 1, text: turnAnnouncement(next) } : before.announcement });
  };
  const report = (text: string): void => {
    const before = current.current;
    publish({ ...before, loadStatus: text, announcement: { id: before.announcement.id + 1, text } });
  };
  return {
    ...session,
    activate,
    newGame: (): void => {
      const game = current.current.game;
      replace(freshGame(game.board.size, game.board.seed));
    },
    restart: (): void => {
      const game = createGame(current.current.game.board.code);
      if (game) replace(game);
    },
    changeSize: (size: Size): void => {
      if (size !== current.current.game.board.size) replace(freshGame(size, current.current.game.board.seed));
    },
    loadBoard: (text: string): void => {
      const game = createGame(text.trim());
      if (game) replace(game);
      else report('Invalid board code.');
    },
    loadSnapshot: (text: string): void => {
      const game = decodeSnapshot(text);
      if (game) replace(game, !isWon(game), isWon(game)
        ? 'Loaded completed snapshot.' : 'Loaded snapshot. Select Resume to continue.');
      else report('Invalid snapshot.');
    },
    exportSnapshot: (): string => {
      const game = settle(performance.now());
      if (game !== current.current.game) publish({ ...current.current, game });
      return encodeSnapshot(game);
    },
    resume: (): void => {
      lastTime.current = performance.now();
      publish({ ...current.current, paused: false });
    },
  };
}
