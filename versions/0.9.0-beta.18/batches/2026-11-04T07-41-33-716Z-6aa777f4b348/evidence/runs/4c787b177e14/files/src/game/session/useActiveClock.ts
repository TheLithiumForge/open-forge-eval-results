import { useRef } from "react";
import type { MutableRefObject } from "react";
import { advanceGame, isWon } from "../transitions.ts";
import type { GameState } from "../types.ts";

export type ActiveClock = Readonly<{
  tickAt: (now: number) => GameState;
  reset: () => void;
  begin: (now: number) => void;
  suspend: () => void;
  resumeAt: (now: number) => void;
}>;

export function useActiveClock(
  gameRef: MutableRefObject<GameState>,
  pausedRef: MutableRefObject<boolean>,
  visibleRef: MutableRefObject<boolean>,
  commit: (game: GameState) => void,
): ActiveClock {
  const lastTimeRef = useRef<number | null>(null);
  const fractionalMsRef = useRef(0);

  function tickAt(now: number): GameState {
    const current = gameRef.current;
    if (!visibleRef.current || pausedRef.current || !current.started || isWon(current)) {
      lastTimeRef.current = null;
      return current;
    }
    const last = lastTimeRef.current;
    if (last === null) {
      lastTimeRef.current = now;
      return current;
    }
    const elapsed = now - last + fractionalMsRef.current;
    const wholeMs = Math.floor(elapsed);
    fractionalMsRef.current = elapsed - wholeMs;
    lastTimeRef.current = now;
    if (wholeMs > 0) {
      const next = advanceGame(current, wholeMs);
      if (next !== current) commit(next);
      return next;
    }
    return current;
  }

  return {
    tickAt,
    reset() {
      lastTimeRef.current = null;
      fractionalMsRef.current = 0;
    },
    begin(now) {
      lastTimeRef.current = now;
      fractionalMsRef.current = 0;
    },
    suspend() {
      lastTimeRef.current = null;
    },
    resumeAt(now) {
      const current = gameRef.current;
      lastTimeRef.current = current.started && !isWon(current) && visibleRef.current ? now : null;
    },
  };
}
