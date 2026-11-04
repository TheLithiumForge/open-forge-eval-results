import { useEffect, useRef, type Dispatch, type SetStateAction } from 'react';
import { advanceGame, isWon } from '../transitions.ts';
import type { GameState } from '../types.ts';

type GameRef = { current: GameState };
type EpochRef = { current: number };

export function useActiveClock(
  gameRef: GameRef,
  setGame: Dispatch<SetStateAction<GameState>>,
  epoch: number,
  epochRef: EpochRef,
  paused: boolean,
): () => void {
  const flushRef = useRef<() => void>(() => {});
  useEffect(() => {
    if (paused) return;
    const capturedEpoch = epoch;
    let active = !document.hidden;
    let lastTime = performance.now();
    let remainder = 0;
    let timeoutId: number | undefined;
    const accrue = (): void => {
      const now = performance.now();
      const amount = now - lastTime + remainder;
      lastTime = now;
      const whole = Math.floor(amount);
      remainder = amount - whole;
      if (!active || whole < 1 || epochRef.current !== capturedEpoch) return;
      const current = gameRef.current;
      const next = advanceGame(current, whole);
      if (next !== current) { gameRef.current = next; setGame(next); }
    };
    const schedule = (): void => {
      if (!active || isWon(gameRef.current)) return;
      const current = gameRef.current;
      const delay = current.selection.kind === 'mismatch' ? Math.min(50, current.selection.remainingMs) : 50;
      timeoutId = window.setTimeout(() => { accrue(); schedule(); }, Math.max(1, delay));
    };
    const onVisibility = (): void => {
      if (document.hidden) {
        if (active) accrue();
        active = false;
        if (timeoutId !== undefined) window.clearTimeout(timeoutId);
      } else {
        active = true;
        lastTime = performance.now();
        remainder = 0;
        schedule();
      }
    };
    flushRef.current = accrue;
    document.addEventListener('visibilitychange', onVisibility);
    schedule();
    return () => {
      flushRef.current = () => {};
      document.removeEventListener('visibilitychange', onVisibility);
      if (timeoutId !== undefined) window.clearTimeout(timeoutId);
    };
  }, [epoch, gameRef, epochRef, paused, setGame]);
  return () => flushRef.current();
}
