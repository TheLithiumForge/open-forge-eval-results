import { useCallback, useEffect, useRef, type Dispatch, type MutableRefObject, type SetStateAction } from "react";
import { isWon, type GameState } from "../state.ts";
import { advanceGame } from "../transitions.ts";

export function useActiveClock(
  gameRef: MutableRefObject<GameState>,
  pausedRef: MutableRefObject<boolean>,
  setGame: Dispatch<SetStateAction<GameState>>,
) {
  const lastTick = useRef(performance.now());
  const fractionalMs = useRef(0);
  const reset = useCallback(() => {
    lastTick.current = performance.now();
    fractionalMs.current = 0;
  }, []);

  useEffect(() => {
    let visible = document.visibilityState === "visible";
    const advanceClock = (now: number) => {
      const current = gameRef.current;
      if (pausedRef.current || !visible || !current.started || isWon(current)) {
        lastTick.current = now;
        fractionalMs.current = 0;
        return;
      }
      fractionalMs.current += Math.max(0, now - lastTick.current);
      lastTick.current = now;
      const milliseconds = Math.floor(fractionalMs.current);
      fractionalMs.current -= milliseconds;
      if (milliseconds > 0) {
        const next = advanceGame(current, milliseconds);
        gameRef.current = next;
        setGame(next);
      }
    };
    const timer = window.setInterval(() => advanceClock(performance.now()), 25);
    const visibilityChange = () => {
      const now = performance.now();
      if (visible && document.visibilityState !== "visible") advanceClock(now);
      visible = document.visibilityState === "visible";
      reset();
    };
    document.addEventListener("visibilitychange", visibilityChange);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", visibilityChange);
    };
  }, [gameRef, pausedRef, reset, setGame]);

  return reset;
}
