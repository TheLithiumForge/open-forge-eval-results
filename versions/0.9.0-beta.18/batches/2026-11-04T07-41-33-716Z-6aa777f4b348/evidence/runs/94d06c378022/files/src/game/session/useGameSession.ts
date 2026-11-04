import { useCallback, useEffect, useRef, useState } from 'react';
import { BOARD_SIZES } from '../board.ts';
import type { BoardSize } from '../board.ts';
import { createGame } from '../createGame.ts';
import { decodeSnapshot, encodeSnapshot } from '../snapshot.ts';
import type { GameState } from '../state.ts';
import { activateCard, advanceGame, isWon } from '../transitions.ts';
import { turnResult } from './announcements.ts';
import { clockStep, EMPTY_CLOCK, nextClockDelay, pauseClock, resumeClock } from './activeClock.ts';
import type { ClockCursor } from './activeClock.ts';
import { freshBoardCode } from './seed.ts';
import type { GameSession, SessionView } from './sessionTypes.ts';
import { readBestScores, readPreferredSize, storeBest, writePreferredSize } from './storage.ts';
import type { BestScores } from './storage.ts';

function initialView(): SessionView {
  const size = readPreferredSize() ?? BOARD_SIZES[0];
  const game = createGame(freshBoardCode(size));
  if (game === null) throw new Error('Could not create a game');
  const scores = readBestScores();
  return {
    game, dealId: 0, bestMoves: scores[size] ?? null, paused: false,
    celebration: false, announcement: null, status: ''
  };
}

function browserNow(): number {
  return performance.now();
}

export function useGameSession(): GameSession {
  const [view, setView] = useState(initialView);
  const viewRef = useRef(view);
  const scoresRef = useRef<BestScores | null>(null);
  if (scoresRef.current === null) scoresRef.current = readBestScores();
  const clockRef = useRef<ClockCursor>(EMPTY_CLOCK);
  const visibleRef = useRef(document.visibilityState !== 'hidden');
  const sequenceRef = useRef(0);
  const dealRef = useRef(view.dealId);
  const recordBestRef = useRef(true);
  const syncRef = useRef<() => void>(() => {});

  const publish = useCallback((next: SessionView): void => {
    viewRef.current = next;
    setView(next);
  }, []);

  const syncClock = useCallback((): void => {
    const step = clockStep(clockRef.current, browserNow());
    clockRef.current = step.cursor;
    const current = viewRef.current;
    if (step.elapsedWholeMs === 0 || current.paused || !visibleRef.current || isWon(current.game)) return;
    const game = advanceGame(current.game, step.elapsedWholeMs);
    if (game !== current.game) publish({ ...current, game });
  }, [publish]);
  syncRef.current = syncClock;

  const announce = useCallback((text: string): SessionView['announcement'] => {
    sequenceRef.current += 1;
    return { id: sequenceRef.current, text };
  }, []);

  const replaceDeal = useCallback((game: GameState, status: string, paused: boolean, importedComplete: boolean): void => {
    dealRef.current += 1;
    clockRef.current = EMPTY_CLOCK;
    recordBestRef.current = !importedComplete;
    const scores = scoresRef.current ?? {};
    publish({
      game, dealId: dealRef.current, bestMoves: scores[game.board.size] ?? null,
      paused, celebration: false, announcement: status ? announce(status) : null, status
    });
  }, [announce, publish]);

  const activate = useCallback((index: number): void => {
    if (viewRef.current.paused) return;
    syncRef.current();
    const current = viewRef.current;
    const nextGame = activateCard(current.game, index);
    if (nextGame === current.game) return;
    if (!current.game.started && nextGame.started) clockRef.current = resumeClock(EMPTY_CLOCK, browserNow());
    const result = turnResult(current.game, nextGame);
    const won = !isWon(current.game) && isWon(nextGame);
    let scores = scoresRef.current ?? {};
    if (won && recordBestRef.current) {
      scores = storeBest(nextGame.board.size, nextGame.moves, scores);
      scoresRef.current = scores;
    }
    publish({
      ...current, game: nextGame, bestMoves: scores[nextGame.board.size] ?? null,
      celebration: current.celebration || (won && recordBestRef.current),
      announcement: result === null ? current.announcement : announce(result)
    });
  }, [announce, publish]);

  const newGame = useCallback((): void => {
    const current = viewRef.current;
    syncRef.current();
    const code = freshBoardCode(current.game.board.size, current.game.board.code);
    const game = createGame(code);
    if (game !== null) replaceDeal(game, '', false, false);
  }, [replaceDeal]);

  const restart = useCallback((): void => {
    syncRef.current();
    const game = createGame(viewRef.current.game.board.code);
    if (game !== null) replaceDeal(game, '', false, false);
  }, [replaceDeal]);

  const changeSize = useCallback((size: BoardSize): void => {
    const current = viewRef.current;
    if (current.game.board.size === size) return;
    syncRef.current();
    const game = createGame(freshBoardCode(size, current.game.board.code));
    if (game === null) return;
    writePreferredSize(size);
    replaceDeal(game, '', false, false);
  }, [replaceDeal]);

  const loadBoard = useCallback((draft: string): boolean => {
    const game = createGame(draft.trim());
    if (game === null) {
      const current = viewRef.current;
      publish({ ...current, status: 'Invalid board code.', announcement: announce('Invalid board code.') });
      return false;
    }
    syncRef.current();
    writePreferredSize(game.board.size);
    replaceDeal(game, '', false, false);
    return true;
  }, [announce, publish, replaceDeal]);

  const exportSnapshot = useCallback((): string => {
    syncRef.current();
    return encodeSnapshot(viewRef.current.game);
  }, []);

  const loadSnapshot = useCallback((draft: string): boolean => {
    const game = decodeSnapshot(draft);
    if (game === null) {
      const current = viewRef.current;
      publish({ ...current, status: 'Invalid snapshot.', announcement: announce('Invalid snapshot.') });
      return false;
    }
    syncRef.current();
    writePreferredSize(game.board.size);
    const completed = isWon(game);
    const status = completed ? 'Loaded completed snapshot.' : 'Loaded snapshot. Select Resume to continue.';
    replaceDeal(game, status, !completed, completed);
    return true;
  }, [announce, publish, replaceDeal]);

  const resume = useCallback((): void => {
    const current = viewRef.current;
    if (!current.paused || isWon(current.game)) return;
    clockRef.current = resumeClock(clockRef.current, browserNow());
    publish({ ...current, paused: false, status: '' });
  }, [publish]);

  const running = view.game.started && !view.paused && visibleRef.current && !isWon(view.game);
  useEffect(() => {
    if (!running) return undefined;
    const dealId = view.dealId;
    let timer = 0;
    const tick = (): void => {
      if (dealRef.current !== dealId) return;
      syncRef.current();
      timer = window.setTimeout(tick, nextClockDelay(viewRef.current.game.selection));
    };
    timer = window.setTimeout(tick, nextClockDelay(viewRef.current.game.selection));
    return () => window.clearTimeout(timer);
  }, [running, view.dealId]);

  useEffect(() => {
    const onVisibility = (): void => {
      const shown = document.visibilityState !== 'hidden';
      if (shown === visibleRef.current) return;
      if (!shown) {
        syncRef.current();
        clockRef.current = pauseClock(clockRef.current);
      } else {
        clockRef.current = resumeClock(clockRef.current, browserNow());
      }
      visibleRef.current = shown;
      setView((current) => {
        const next = { ...current };
        viewRef.current = next;
        return next;
      });
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, []);

  return {
    ...view,
    size: view.game.board.size,
    activate, newGame, restart, changeSize, loadBoard, exportSnapshot, loadSnapshot, resume
  };
}
