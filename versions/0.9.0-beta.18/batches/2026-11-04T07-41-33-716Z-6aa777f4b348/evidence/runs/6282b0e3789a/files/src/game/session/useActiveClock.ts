import { useCallback, useEffect, useRef } from 'react';
import type { RefObject } from 'react';
import { advanceGame } from '../advanceGame.ts';
import { isWon } from '../state.ts';
import type { GameState } from '../state.ts';

interface ClockOptions {
  readonly game: RefObject<GameState>;
  readonly paused: RefObject<boolean>;
  readonly generation: RefObject<number>;
  readonly publish: (game: GameState) => void;
}

const CLOCK_RENDER_MS = 100;

export function useActiveClock({ game, paused, generation, publish }: ClockOptions) {
  const last = useRef(0);
  const shown = useRef(!document.hidden);
  const alive = useRef(false);
  const timeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scheduleRef = useRef<() => void>(() => undefined);

  const clear = useCallback(() => {
    if (timeout.current !== null) clearTimeout(timeout.current);
    timeout.current = null;
  }, []);

  const sample = useCallback(() => {
    const now = performance.now();
    const delta = Math.max(0, now - last.current);
    last.current = now;
    if (shown.current && !paused.current) {
      const next = advanceGame(game.current, delta);
      if (next !== game.current) {
        game.current = next;
        publish(next);
      }
    }
    return game.current;
  }, [game, paused, publish]);

  const schedule = useCallback(() => {
    clear();
    if (!alive.current || !shown.current || paused.current || !game.current.started || isWon(game.current)) return;
    const version = generation.current;
    const selection = game.current.selection;
    const delay = selection.kind === 'mismatch' ? Math.min(CLOCK_RENDER_MS, selection.remainingMs) : CLOCK_RENDER_MS;
    timeout.current = setTimeout(() => {
      if (!alive.current || generation.current !== version) return;
      sample();
      scheduleRef.current();
    }, delay);
  }, [clear, game, generation, paused, sample]);
  scheduleRef.current = schedule;

  const reset = useCallback(() => {
    last.current = performance.now();
    schedule();
  }, [schedule]);

  useEffect(() => {
    alive.current = true;
    shown.current = !document.hidden;
    reset();
    const visibilityChanged = () => {
      sample();
      shown.current = !document.hidden;
      reset();
    };
    document.addEventListener('visibilitychange', visibilityChanged);
    return () => {
      alive.current = false;
      clear();
      document.removeEventListener('visibilitychange', visibilityChanged);
    };
  }, [clear, reset, sample]);

  return { sample, schedule, reset };
}
