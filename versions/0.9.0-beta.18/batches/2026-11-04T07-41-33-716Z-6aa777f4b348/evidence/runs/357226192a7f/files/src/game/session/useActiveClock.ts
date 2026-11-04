import { useCallback, useEffect, useRef } from 'react';
import { isWon } from '../state.ts';
import type { GameState } from '../state.ts';
import { advanceGame } from '../turn.ts';

type ClockState = Readonly<{ game: GameState; paused: boolean }>;

export function useActiveClock(read: () => ClockState, commit: (state: GameState) => void) {
  const last = useRef(performance.now());
  const fraction = useRef(0);
  const visible = useRef(!document.hidden);
  const epoch = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const mounted = useRef(false);

  const sync = useCallback(() => {
    const now = performance.now();
    const delta = Math.max(0, now - last.current);
    last.current = now;
    const { game, paused } = read();
    if (visible.current && !paused && game.started && !isWon(game)) {
      const total = fraction.current + delta;
      const whole = Math.floor(total);
      fraction.current = total - whole;
      if (whole > 0) commit(advanceGame(game, whole));
    }
  }, [read, commit]);

  const schedule = useCallback(function scheduleTick() {
    const token = epoch.current;
    const { game, paused } = read();
    if (!mounted.current || !visible.current || paused || !game.started || isWon(game)) return;
    const delay = game.selection.kind === 'mismatch' ? Math.min(50, game.selection.remainingMs) : 50;
    timer.current = setTimeout(() => {
      if (epoch.current !== token || !mounted.current) return;
      sync();
      scheduleTick();
    }, delay);
  }, [read, sync]);

  const reset = useCallback(() => {
    epoch.current += 1;
    clearTimeout(timer.current);
    last.current = performance.now();
    fraction.current = 0;
    schedule();
  }, [schedule]);

  const wake = useCallback(() => {
    epoch.current += 1;
    clearTimeout(timer.current);
    schedule();
  }, [schedule]);

  useEffect(() => {
    mounted.current = true;
    const onVisibility = () => {
      sync();
      visible.current = !document.hidden;
      wake();
    };
    document.addEventListener('visibilitychange', onVisibility);
    reset();
    return () => {
      mounted.current = false;
      epoch.current += 1;
      clearTimeout(timer.current);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [sync, reset, wake]);

  return { sync, reset, wake };
}
