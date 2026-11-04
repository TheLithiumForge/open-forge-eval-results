import { useCallback, useEffect, useRef, useState } from "react";
import { BOARD_SIZES, type BoardSize } from "../boardCode.ts";
import { advanceGame, type GameState } from "../state.ts";
import { takeClockDelta } from "./clock.ts";
import { freshGame } from "./freshGame.ts";
import { browserStorage, readBestScores, readPreferredSize, type SessionStorage } from "./storage.ts";
import { useSessionActions } from "./useSessionActions.ts";

export interface SessionAnnouncement {
  readonly id: number;
  readonly text: string;
}

export interface GameSession {
  readonly game: GameState;
  readonly bestMoves: number | null;
  readonly paused: boolean;
  readonly revision: number;
  readonly celebrationId: number | null;
  readonly announcement: SessionAnnouncement | null;
  readonly statusMessage: string;
  readonly activateCard: (index: number) => void;
  readonly newGame: () => void;
  readonly restart: () => void;
  readonly chooseSize: (size: BoardSize) => void;
  readonly loadBoard: (code: string) => boolean;
  readonly loadSnapshot: (text: string) => boolean;
  readonly exportSnapshot: () => string;
  readonly resume: () => void;
}

export function useGameSession(): GameSession {
  const storageRef = useRef<SessionStorage | null>(null);
  const [game, setGame] = useState<GameState>(() => {
    const storage = browserStorage();
    storageRef.current = storage;
    return freshGame(readPreferredSize(storage) ?? BOARD_SIZES[0]);
  });
  const [scores, setScores] = useState(() => readBestScores(storageRef.current));
  const [paused, setPaused] = useState(false);
  const [revision, setRevision] = useState(0);
  const [celebrationId, setCelebrationId] = useState<number | null>(null);
  const [announcement, setAnnouncement] = useState<SessionAnnouncement | null>(null);
  const [statusMessage, setStatusMessage] = useState("");
  const stateRef = useRef(game);
  const pausedRef = useRef(paused);
  const clockRunningRef = useRef(typeof document === "undefined" || !document.hidden);
  const lastClockRef = useRef<number | null>(null);
  const fractionRef = useRef(0);

  stateRef.current = game;
  pausedRef.current = paused;

  const updateGame = useCallback((next: GameState) => {
    stateRef.current = next;
    setGame(next);
  }, []);

  const syncClock = useCallback((at: number = performance.now()): GameState => {
    if (!clockRunningRef.current || pausedRef.current) {
      lastClockRef.current = at;
      return stateRef.current;
    }
    const previous = lastClockRef.current;
    lastClockRef.current = at;
    if (previous === null) return stateRef.current;
    const delta = takeClockDelta(previous, at, fractionRef.current);
    fractionRef.current = delta.fraction;
    if (delta.milliseconds === 0) return stateRef.current;
    const current = stateRef.current;
    const next = advanceGame(current, delta.milliseconds);
    if (next !== current) updateGame(next);
    return next;
  }, [updateGame]);

  useEffect(() => {
    let active = true;
    clockRunningRef.current = !document.hidden;
    lastClockRef.current = performance.now();
    const timer = window.setInterval(() => {
      if (active) syncClock();
    }, 50);
    const onVisibility = () => {
      if (!active) return;
      const now = performance.now();
      if (document.hidden) {
        syncClock(now);
        clockRunningRef.current = false;
      } else {
        lastClockRef.current = now;
        clockRunningRef.current = true;
      }
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      active = false;
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisibility);
      lastClockRef.current = null;
      clockRunningRef.current = false;
    };
  }, [revision, syncClock]);

  const actions = useSessionActions({
    storage: storageRef.current,
    stateRef,
    pausedRef,
    lastClockRef,
    fractionRef,
    scores,
    setScores,
    setGame,
    setPaused,
    setRevision,
    setCelebrationId,
    setAnnouncement,
    setStatusMessage,
    syncClock,
  });

  return { game, bestMoves: scores[game.size] ?? null, paused, revision, celebrationId, announcement, statusMessage, ...actions };
}
