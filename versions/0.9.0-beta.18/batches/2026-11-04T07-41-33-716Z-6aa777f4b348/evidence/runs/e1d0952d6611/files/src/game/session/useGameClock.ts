import { useEffect, useRef, type MutableRefObject } from 'react';
import { advanceGame, isWon } from '../transitions.ts';
import type { GameState } from '../state.ts';

const TICK_MS = 50;
type ApplyState = (state: GameState) => void;

export function useGameClock(stateRef: MutableRefObject<GameState>, pausedRef: MutableRefObject<boolean>,
  resetKey: number, apply: ApplyState) {
  const active = useRef(false);
  const lastTime = useRef(performance.now());
  const mismatchTimer = useRef<number | undefined>(undefined);
  const mismatchToken = useRef(0);
  const dealToken = useRef(0);
  const applyRef = useRef(apply);
  applyRef.current = apply;

  function clearMismatch(): void {
    mismatchToken.current += 1;
    if (mismatchTimer.current !== undefined) window.clearTimeout(mismatchTimer.current);
    mismatchTimer.current = undefined;
  }

  function synchronize(includeHidden = false): void {
    if (!active.current || pausedRef.current || (!includeHidden && document.hidden)) return;
    const currentTime = performance.now();
    const delta = Math.max(0, currentTime - lastTime.current);
    lastTime.current = currentTime;
    const previous = stateRef.current;
    if (delta > 0) applyRef.current(advanceGame(previous, delta));
    const next = stateRef.current;
    if (previous.selection.kind === 'mismatch' && next.selection.kind !== 'mismatch') clearMismatch();
    if (isWon(next)) active.current = false;
  }

  function setCurrentClock(): void {
    lastTime.current = performance.now();
    const current = stateRef.current;
    active.current = !pausedRef.current && !document.hidden && current.started && !isWon(current);
  }

  function scheduleMismatch(): void {
    clearMismatch();
    const selection = stateRef.current.selection;
    if (selection.kind !== 'mismatch' || pausedRef.current || document.hidden) return;
    const token = mismatchToken.current;
    const deal = dealToken.current;
    mismatchTimer.current = window.setTimeout(() => {
      if (token !== mismatchToken.current || deal !== dealToken.current) return;
      mismatchTimer.current = undefined;
      synchronize();
      if (stateRef.current.selection.kind === 'mismatch') scheduleMismatch();
    }, Math.max(1, selection.remainingMs));
  }

  function invalidateDeal(): void {
    dealToken.current += 1;
    clearMismatch();
  }

  useEffect(() => {
    const deal = dealToken.current;
    let live = true;
    let timer: number | undefined;
    const tick = () => {
      if (!live || deal !== dealToken.current) return;
      synchronize();
      if (stateRef.current.selection.kind === 'mismatch' && mismatchTimer.current === undefined) scheduleMismatch();
      timer = window.setTimeout(tick, TICK_MS);
    };
    const visibility = () => {
      if (document.hidden) {
        synchronize(true);
        active.current = false;
        clearMismatch();
        if (timer !== undefined) window.clearTimeout(timer);
        timer = undefined;
      } else {
        setCurrentClock();
        scheduleMismatch();
        if (timer === undefined) timer = window.setTimeout(tick, TICK_MS);
      }
    };
    if (!document.hidden) timer = window.setTimeout(tick, TICK_MS);
    document.addEventListener('visibilitychange', visibility);
    return () => {
      live = false;
      dealToken.current += 1;
      clearMismatch();
      document.removeEventListener('visibilitychange', visibility);
      if (timer !== undefined) window.clearTimeout(timer);
    };
  }, [resetKey]);

  return { synchronize, setCurrentClock, scheduleMismatch, invalidateDeal } as const;
}
