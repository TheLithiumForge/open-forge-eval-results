import { useEffect, useRef } from "react";
import { advanceGame, isWon } from "../transitions.ts";
import type { GameState } from "../types.ts";

type GameRef = { current: GameState };
type PauseRef = { current: boolean };

export function useActiveClock(
  gameRef: GameRef,
  pausedRef: PauseRef,
  commit: (state: GameState) => void,
) {
  const lastActiveAt = useRef<number | null>(null);

  function advanceToNow(includeHidden = false, updateGame = true): GameState {
    const current = gameRef.current;
    if ((document.hidden && !includeHidden) || pausedRef.current || !current.started || isWon(current)) {
      return current;
    }
    const now = performance.now();
    const last = lastActiveAt.current;
    if (last === null) {
      lastActiveAt.current = now;
      return current;
    }
    const elapsed = Math.floor(now - last);
    if (elapsed < 1) return current;
    lastActiveAt.current = last + elapsed;
    const next = advanceGame(current, elapsed);
    if (updateGame) commit(next);
    return next;
  }

  useEffect(() => {
    let timer: number | undefined;
    const schedule = (delay: number) => { timer = window.setTimeout(tick, delay); };
    const tick = () => {
      const current = gameRef.current;
      if (document.hidden || pausedRef.current || !current.started || isWon(current)) {
        lastActiveAt.current = null;
        schedule(100);
        return;
      }
      advanceToNow();
      const next = gameRef.current;
      const delay = next.selection.kind === "mismatch"
        ? Math.min(25, next.selection.remainingMs)
        : 100;
      schedule(delay);
    };
    const visibilityChanged = () => {
      if (document.hidden) {
        advanceToNow(true);
        lastActiveAt.current = null;
      } else if (gameRef.current.started && !pausedRef.current && !isWon(gameRef.current)) {
        lastActiveAt.current = performance.now();
      }
    };
    document.addEventListener("visibilitychange", visibilityChanged);
    schedule(25);
    return () => {
      if (timer !== undefined) window.clearTimeout(timer);
      document.removeEventListener("visibilitychange", visibilityChanged);
    };
  }, []);

  return {
    sync: () => advanceToNow(),
    capture: () => advanceToNow(false, false),
    reset: () => { lastActiveAt.current = null; },
    start: () => { lastActiveAt.current = performance.now(); },
  };
}
