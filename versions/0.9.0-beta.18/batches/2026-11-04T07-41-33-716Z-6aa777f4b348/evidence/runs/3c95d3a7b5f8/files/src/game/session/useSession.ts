import { useCallback, useRef, useState } from 'react';
import { activateCard } from '../activateCard.ts';
import { parseBoardCode } from '../boardCode.ts';
import type { GridSize } from '../boardCode.ts';
import { decodeSnapshot, encodeSnapshot } from '../snapshot.ts';
import { createGame, isWon } from '../state.ts';
import type { GameState } from '../state.ts';
import { sampleActiveGame } from './activeTime.ts';
import { nextAnnouncement, turnAnnouncement } from './announcements.ts';
import { freshGame } from './deals.ts';
import { initialSession } from './sessionState.ts';
import type { SessionState } from './sessionState.ts';
import { recordBest, savePreferences } from './storage.ts';
import { useBrowserClock } from './useBrowserClock.ts';

export function useSession() {
  const [state, setState] = useState(initialSession);
  const current = useRef(state);
  const clock = useRef({ atMs: performance.now(), visible: !document.hidden });
  const publish = useCallback((next: SessionState) => {
    current.current = next;
    setState(next);
  }, []);
  useBrowserClock(current, clock, publish, state.dealId);

  const sample = () => sampleActiveGame(current.current.game, current.current.paused, clock.current, performance.now());
  const report = (text: string) => publish({
    ...current.current, loadStatus: text,
    announcement: nextAnnouncement(current.current.announcement, text),
  });
  const replace = (game: GameState, paused: boolean, loadStatus = '') => {
    const previous = current.current;
    const preferences = { ...previous.preferences, size: game.board.size };
    clock.current.atMs = performance.now();
    savePreferences(preferences);
    publish({
      ...previous, game, preferences, paused, celebrate: false,
      dealId: previous.dealId + 1, loadStatus,
      announcement: nextAnnouncement(previous.announcement, loadStatus),
    });
  };
  const activate = (index: number) => {
    const previous = current.current;
    if (previous.paused) return;
    const now = performance.now();
    const before = sampleActiveGame(previous.game, false, clock.current, now);
    clock.current.atMs = now;
    const game = activateCard(before, index);
    const text = turnAnnouncement(before, game);
    const won = !isWon(before) && isWon(game);
    const preferences = won ? recordBest(previous.preferences, game.board.size, game.moves) : previous.preferences;
    if (preferences !== previous.preferences) savePreferences(preferences);
    publish({
      ...previous, game, preferences, celebrate: previous.celebrate || won,
      announcement: text === null ? previous.announcement : nextAnnouncement(previous.announcement, text),
    });
  };
  const loadBoard = (draft: string): boolean => {
    const board = parseBoardCode(draft.trim());
    if (!board) { report('Invalid board code.'); return false; }
    replace(createGame(board.code), false, 'Loaded board.');
    return true;
  };
  const loadSnapshot = (draft: string): boolean => {
    const game = decodeSnapshot(draft);
    if (!game) { report('Invalid snapshot.'); return false; }
    const completed = isWon(game);
    replace(game, !completed, completed ? 'Loaded completed snapshot.' : 'Loaded snapshot. Select Resume to continue.');
    return true;
  };
  const resume = () => {
    if (!current.current.paused) return;
    clock.current.atMs = performance.now();
    publish({ ...current.current, paused: false });
  };
  const changeSize = (size: GridSize) => {
    if (size !== current.current.game.board.size) replace(freshGame(size, current.current.game.board.seed), false);
  };
  return {
    game: state.game, dealId: state.dealId, paused: state.paused, celebrate: state.celebrate,
    best: state.preferences.bests[state.game.board.size] ?? null,
    announcement: state.announcement, loadStatus: state.loadStatus,
    activate, changeSize, loadBoard, loadSnapshot, resume,
    newGame: () => replace(freshGame(current.current.game.board.size, current.current.game.board.seed), false),
    restart: () => replace(createGame(current.current.game.board.code), false),
    exportSnapshot: () => encodeSnapshot(sample()),
  };
}

export type GameSession = ReturnType<typeof useSession>;
