import { useCallback } from 'react';
import type { RefObject } from 'react';
import { BOARD_SIZES, type BoardSize } from '../constants.ts';
import { decodeSnapshot, encodeSnapshot } from '../snapshot.ts';
import { activateCard as transitionCard, createGame, isWon } from '../transitions.ts';
import type { GameState } from '../types.ts';
import { formatElapsedTime } from './formatTime.ts';
import { freshBoardCode } from './freshBoard.ts';
import type { GameSession } from './sessionTypes.ts';
import type { SessionPreferences } from './storage.ts';

type Actions = Pick<GameSession, 'activateCard' | 'newGame' | 'restart' | 'changeSize' | 'loadBoard' | 'loadSnapshot' | 'exportSnapshot' | 'resume'>;
type SessionRefs = Readonly<{
  game: RefObject<GameState>;
  preferences: RefObject<SessionPreferences>;
  paused: RefObject<boolean>;
  activeAt: RefObject<number | null>;
  mismatchTurn: RefObject<number>;
}>;
type SessionUpdates = Readonly<{
  flushAt: (now: number) => void;
  commitGame: (game: GameState) => void;
  notify: (text: string) => void;
  nextTurn: () => void;
  persist: (value: SessionPreferences) => void;
  replaceGame: (game: GameState, pauseForResume: boolean) => void;
  setCelebration: (value: boolean) => void;
  setLoadStatus: (value: string) => void;
  setPause: (value: boolean) => void;
}>;

function isBoardSize(value: number): value is BoardSize {
  return BOARD_SIZES.some((size) => size === value);
}

function turnAnnouncement(previous: GameState, next: GameState): string {
  if (next.matched.length === previous.matched.length) return 'No match. Cards close after a short pause.';
  if (isWon(next)) return `Pair found. All pairs found in ${next.moves} moves and ${formatElapsedTime(next.elapsedMs)}.`;
  const pairs = next.matched.length / 2;
  return `Pair found. ${pairs} ${pairs === 1 ? 'pair' : 'pairs'} matched.`;
}

export function useSessionActions(refs: SessionRefs, updates: SessionUpdates): Actions {
  const activateCard = useCallback((index: number): void => {
    const now = performance.now();
    updates.flushAt(now);
    const previous = refs.game.current;
    if (refs.paused.current) return;
    const next = transitionCard(previous, index);
    if (next === previous) return;
    if (!previous.started && next.started) refs.activeAt.current = now;
    if (previous.selection.kind === 'one') updates.nextTurn();
    updates.commitGame(next);
    if (previous.selection.kind === 'one') {
      updates.notify(turnAnnouncement(previous, next));
      if (isWon(next)) {
        updates.setCelebration(true);
        const currentBest = refs.preferences.current.bestScores[next.board.size];
        if (currentBest === undefined || next.moves < currentBest) {
          const bestScores = { ...refs.preferences.current.bestScores, [next.board.size]: next.moves };
          updates.persist({ ...refs.preferences.current, bestScores });
        }
      }
    }
  }, [refs, updates]);

  const clearLoadStatus = useCallback((): void => {
    updates.setLoadStatus('');
  }, [updates]);

  const newGame = useCallback((): void => {
    const current = refs.game.current;
    updates.replaceGame(createRequiredGame(freshBoardCode(current.board.size, current.board.code)), false);
    clearLoadStatus();
  }, [clearLoadStatus, refs, updates]);

  const restart = useCallback((): void => {
    const game = createRequiredGame(refs.game.current.board.code);
    updates.replaceGame(game, false);
    clearLoadStatus();
  }, [clearLoadStatus, refs, updates]);

  const changeSize = useCallback((size: number): void => {
    if (!isBoardSize(size) || size === refs.game.current.board.size) return;
    const game = createRequiredGame(freshBoardCode(size));
    updates.replaceGame(game, false);
    updates.persist({ ...refs.preferences.current, size });
    clearLoadStatus();
  }, [clearLoadStatus, refs, updates]);

  const reportLoad = useCallback((status: string): void => {
    updates.setLoadStatus(status);
    updates.notify(status);
  }, [updates]);

  const loadBoard = useCallback((draft: string): boolean => {
    const game = createGame(draft.trim());
    if (game === null) {
      reportLoad('Invalid board code.');
      return false;
    }
    updates.replaceGame(game, false);
    updates.persist({ ...refs.preferences.current, size: game.board.size });
    reportLoad('Board loaded.');
    return true;
  }, [refs, reportLoad, updates]);

  const loadSnapshot = useCallback((draft: string): boolean => {
    const game = decodeSnapshot(draft);
    if (game === null) {
      reportLoad('Invalid snapshot.');
      return false;
    }
    const completed = isWon(game);
    updates.replaceGame(game, !completed);
    updates.persist({ ...refs.preferences.current, size: game.board.size });
    reportLoad(completed ? 'Loaded completed snapshot.' : 'Loaded snapshot. Select Resume to continue.');
    return true;
  }, [refs, reportLoad, updates]);

  const exportSnapshot = useCallback((): string => {
    updates.flushAt(performance.now());
    return encodeSnapshot(refs.game.current);
  }, [refs, updates]);

  const resume = useCallback((): void => {
    refs.activeAt.current = performance.now();
    updates.setPause(false);
  }, [refs, updates]);

  return { activateCard, newGame, restart, changeSize, loadBoard, loadSnapshot, exportSnapshot, resume };
}

function createRequiredGame(code: string): GameState {
  const game = createGame(code);
  if (game === null) throw new Error('A validated board code must create a game.');
  return game;
}
