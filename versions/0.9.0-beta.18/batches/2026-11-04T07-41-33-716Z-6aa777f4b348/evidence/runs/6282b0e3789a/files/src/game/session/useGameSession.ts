import { useCallback, useRef, useState } from 'react';
import { activateCard } from '../activateCard.ts';
import { isGridSize } from '../boardCode.ts';
import { createGame } from '../createGame.ts';
import { decodeSnapshot, encodeSnapshot } from '../snapshot.ts';
import { isWon } from '../state.ts';
import type { GameState } from '../state.ts';
import { freshGame } from './freshGame.ts';
import { keepBest, readPreferences, writePreferences } from './storage.ts';
import type { Preferences } from './storage.ts';
import { turnAnnouncement } from './turnAnnouncement.ts';
import type { Announcement } from './turnAnnouncement.ts';
import { useActiveClock } from './useActiveClock.ts';

interface SessionView {
  readonly game: GameState;
  readonly preferences: Preferences;
  readonly dealId: number;
  readonly paused: boolean;
  readonly celebrate: boolean;
  readonly announcement: Announcement;
  readonly loadStatus: string;
}

const browserStorage = () => window.localStorage;

function initialSession(): SessionView {
  const preferences = readPreferences(browserStorage);
  return {
    game: freshGame(preferences.size), preferences, dealId: 0, paused: false,
    celebrate: false, announcement: { id: 0, text: '' }, loadStatus: '',
  };
}

export function useGameSession() {
  const [view, setView] = useState(initialSession);
  const game = useRef(view.game);
  const preferences = useRef(view.preferences);
  const paused = useRef(false);
  const generation = useRef(0);
  const announcementId = useRef(0);

  const publish = useCallback((next: GameState) => {
    setView(current => ({ ...current, game: next }));
  }, []);
  const clock = useActiveClock({ game, paused, generation, publish });

  const announce = (text: string) => {
    announcementId.current += 1;
    const announcement = { id: announcementId.current, text };
    setView(current => ({ ...current, announcement }));
  };

  const save = (next: Preferences) => {
    preferences.current = next;
    writePreferences(browserStorage, next);
    setView(current => ({ ...current, preferences: next }));
  };

  const replace = (next: GameState, isPaused: boolean, status = '') => {
    game.current = next;
    paused.current = isPaused;
    generation.current += 1;
    save({ ...preferences.current, size: next.board.size });
    setView(current => ({
      ...current, game: next, dealId: generation.current, paused: isPaused,
      celebrate: false, loadStatus: status,
    }));
    announce(status);
    clock.reset();
  };

  const activate = (index: number) => {
    const before = clock.sample();
    if (paused.current || document.hidden) return;
    const after = activateCard(before, index);
    if (after === before) return;
    game.current = after;
    publish(after);
    const result = turnAnnouncement(before, after);
    if (result !== null) announce(result);
    if (!isWon(before) && isWon(after)) {
      save(keepBest(preferences.current, after.board.size, after.moves));
      setView(current => ({ ...current, celebrate: true }));
    }
    clock.schedule();
  };

  const newGame = () => replace(freshGame(game.current.board.size, game.current.board.seed), false);
  const restart = () => {
    const next = createGame(game.current.board.code);
    if (next) replace(next, false);
  };
  const changeSize = (value: unknown) => {
    if (isGridSize(value) && value !== game.current.board.size) {
      replace(freshGame(value, game.current.board.seed), false);
    }
  };
  const loadBoard = (text: string): boolean => {
    const next = createGame(text.trim());
    if (!next) {
      setView(current => ({ ...current, loadStatus: 'Invalid board code.' }));
      announce('Invalid board code.');
      return false;
    }
    replace(next, false, 'Loaded board.');
    return true;
  };
  const loadSnapshot = (text: string): boolean => {
    const next = decodeSnapshot(text);
    if (!next) {
      setView(current => ({ ...current, loadStatus: 'Invalid snapshot.' }));
      announce('Invalid snapshot.');
      return false;
    }
    const completed = isWon(next);
    replace(next, !completed, completed ? 'Loaded completed snapshot.' : 'Loaded snapshot. Select Resume to continue.');
    return true;
  };
  const exportSnapshot = () => encodeSnapshot(clock.sample());
  const resume = () => {
    if (!paused.current) return;
    paused.current = false;
    setView(current => ({ ...current, paused: false }));
    clock.reset();
  };

  return {
    game: view.game, dealId: view.dealId, paused: view.paused,
    best: view.preferences.best[view.game.board.size] ?? null,
    celebrate: view.celebrate, announcement: view.announcement, loadStatus: view.loadStatus,
    activate, newGame, restart, changeSize, loadBoard, loadSnapshot, exportSnapshot, resume,
  };
}

export type GameSession = ReturnType<typeof useGameSession>;
