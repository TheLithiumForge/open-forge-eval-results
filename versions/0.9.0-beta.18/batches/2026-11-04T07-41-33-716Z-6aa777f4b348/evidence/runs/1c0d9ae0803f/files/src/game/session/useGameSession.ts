import { useEffect, useRef, useState } from "react";
import { type BoardSize } from "../board.ts";
import { activateCard, advanceGame, createGame, isWon, type GameState } from "../state.ts";
import { decodeSnapshot, encodeSnapshot } from "../snapshot.ts";
import { createActiveClock, stepActiveClock } from "./clock.ts";
import { freshGame } from "./deal.ts";
import { initialBestScores, recordCompletedGame } from "./best.ts";
import {
  browserStorage,
  writeGridSize,
  type BestScores,
} from "./storage.ts";
import { turnAnnouncement } from "./turn.ts";
import { initialView, isActive } from "./view.ts";
import type { GameSession, GameSessionView } from "./types.ts";

const TICK_MS = 32;
const WIN_PULSE_MS = 600;

export function useGameSession(): GameSession {
  const storageRef = useRef<ReturnType<typeof browserStorage>>(null);
  const bestScoresRef = useRef<BestScores>({});
  const [view, setView] = useState<GameSessionView>(() => {
    const storage = browserStorage();
    storageRef.current = storage;
    bestScoresRef.current = initialBestScores(storage);
    return initialView(storage, bestScoresRef.current);
  });
  const viewRef = useRef(view);
  const clockRef = useRef(createActiveClock(performance.now()));
  const clockActiveRef = useRef(false);
  const announcementIdRef = useRef(0);
  const pulseTimerRef = useRef<number | null>(null);
  const syncRef = useRef<() => void>(() => undefined);
  const lifecycleRef = useRef(0);

  function commit(next: GameSessionView): void {
    viewRef.current = next;
    setView(next);
  }

  function syncClock(): void {
    const current = viewRef.current;
    const now = performance.now();
    const step = stepActiveClock(clockRef.current, now, clockActiveRef.current);
    clockRef.current = step.clock;
    if (step.milliseconds > 0) {
      const game = advanceGame(current.game, step.milliseconds);
      if (game !== current.game) {
        const next = { ...current, game };
        commit(next);
        clockActiveRef.current = !document.hidden && isActive(next);
        return;
      }
    }
    clockActiveRef.current = !document.hidden && isActive(current);
  }
  syncRef.current = syncClock;

  useEffect(() => {
    const lifecycle = ++lifecycleRef.current;
    return () => {
      if (lifecycleRef.current === lifecycle) lifecycleRef.current += 1;
      if (pulseTimerRef.current !== null) window.clearTimeout(pulseTimerRef.current);
    };
  }, []);

  useEffect(() => {
    const revision = view.dealId;
    const lifecycle = lifecycleRef.current;
    const timer = window.setInterval(() => {
      if (lifecycleRef.current === lifecycle && viewRef.current.dealId === revision) syncRef.current();
    }, TICK_MS);
    return () => window.clearInterval(timer);
  }, [view.dealId]);

  useEffect(() => {
    const lifecycle = lifecycleRef.current;
    const onVisibilityChange = (): void => {
      if (lifecycleRef.current === lifecycle) syncRef.current();
    };
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => document.removeEventListener("visibilitychange", onVisibilityChange);
  }, []);

  function announce(current: GameSessionView, text: string): GameSessionView {
    return { ...current, announcement: { id: ++announcementIdRef.current, text } };
  }

  function replace(game: GameState, paused = false, status?: string): void {
    const current = viewRef.current;
    if (pulseTimerRef.current !== null) window.clearTimeout(pulseTimerRef.current);
    pulseTimerRef.current = null;
    clockRef.current = createActiveClock(performance.now());
    let next: GameSessionView = {
      ...current,
      game,
      paused,
      dealId: current.dealId + 1,
      bestMoves: bestScoresRef.current[game.board.size] ?? null,
      celebrating: false,
      announcement: null,
    };
    if (status) next = announce(next, status);
    commit(next);
    clockActiveRef.current = !document.hidden && isActive(next);
  }

  function activate(index: number): void {
    if (viewRef.current.paused) return;
    syncClock();
    const current = viewRef.current;
    const before = current.game;
    const game = activateCard(before, index);
    if (game === before) return;
    const now = performance.now();
    if (!before.started && game.started) clockRef.current = createActiveClock(now);
    const won = !isWon(before) && isWon(game);
    let savedBest = current.bestMoves;
    if (won) {
      const score = recordCompletedGame(bestScoresRef.current, storageRef.current, game.board.size, game.moves);
      bestScoresRef.current = score.scores;
      savedBest = score.bestMoves;
    }
    let next: GameSessionView = { ...current, game, bestMoves: savedBest,
      celebrating: won || current.celebrating };
    const result = turnAnnouncement(before, game);
    if (result) next = announce(next, result);
    commit(next);
    clockActiveRef.current = !document.hidden && isActive(next);
    if (won) {
      const revision = current.dealId;
      const lifecycle = lifecycleRef.current;
      pulseTimerRef.current = window.setTimeout(() => {
        const latest = viewRef.current;
        if (lifecycleRef.current !== lifecycle || latest.dealId !== revision) return;
        pulseTimerRef.current = null;
        commit({ ...latest, celebrating: false });
      }, WIN_PULSE_MS);
    }
  }

  function loadBoard(code: string): boolean {
    syncClock();
    const game = createGame(code.trim());
    if (!game) {
      commit(announce(viewRef.current, "Invalid board code."));
      return false;
    }
    writeGridSize(storageRef.current, game.board.size);
    replace(game);
    return true;
  }

  function loadSnapshot(text: string): boolean {
    syncClock();
    const game = decodeSnapshot(text);
    if (!game) {
      commit(announce(viewRef.current, "Invalid snapshot."));
      return false;
    }
    const completed = isWon(game);
    writeGridSize(storageRef.current, game.board.size);
    replace(game, !completed, completed ? "Loaded completed snapshot." : "Loaded snapshot. Select Resume to continue.");
    return true;
  }

  function newGame(): void { replace(freshGame(viewRef.current.game.board.size, viewRef.current.game.board.code)); }
  function restart(): void {
    const game = createGame(viewRef.current.game.board.code);
    if (game) replace(game);
  }
  function changeSize(size: BoardSize): void {
    if (size === viewRef.current.game.board.size) return;
    writeGridSize(storageRef.current, size);
    replace(freshGame(size, viewRef.current.game.board.code));
  }
  function resume(): void {
    syncClock();
    const current = viewRef.current;
    if (!current.paused) return;
    const next = { ...current, paused: false };
    commit(next);
    clockActiveRef.current = !document.hidden && isActive(next);
  }
  function exportSnapshot(): string {
    syncClock();
    return encodeSnapshot(viewRef.current.game);
  }

  return { ...view, activateCard: activate, newGame, restart, changeSize, loadBoard, loadSnapshot, resume,
    exportSnapshot };
}
