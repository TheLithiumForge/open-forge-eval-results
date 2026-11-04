import { useCallback, useEffect, useRef } from 'react';
import type { Dispatch, RefObject, SetStateAction } from 'react';
import { advanceGame, isWon } from '../transitions.ts';
import type { GameState } from '../types.ts';

type ClockRefs = Readonly<{
  game: RefObject<GameState>;
  paused: RefObject<boolean>;
  visible: RefObject<boolean>;
  activeAt: RefObject<number | null>;
  generation: RefObject<number>;
}>;

export function useActiveClock(
  refs: ClockRefs,
  running: boolean,
  revision: number,
  setGame: Dispatch<SetStateAction<GameState>>,
  setVisible: Dispatch<SetStateAction<boolean>>,
): (now: number) => void {
  const flushAt = useCallback((now: number): void => {
    const current = refs.game.current;
    if (!refs.visible.current || refs.paused.current || !current.started || isWon(current)) {
      refs.activeAt.current = null;
      return;
    }
    const previousTime = refs.activeAt.current;
    refs.activeAt.current = now;
    if (previousTime === null) return;
    const advanced = advanceGame(current, now - previousTime);
    if (advanced !== current) {
      refs.game.current = advanced;
      setGame(advanced);
    }
  }, [refs, setGame]);
  const flushRef = useRef(flushAt);
  flushRef.current = flushAt;

  useEffect(() => {
    if (!running) {
      refs.activeAt.current = null;
      return;
    }
    if (refs.activeAt.current === null) refs.activeAt.current = performance.now();
    const generation = refs.generation.current;
    const interval = window.setInterval(() => {
      if (generation === refs.generation.current) flushRef.current(performance.now());
    }, 50);
    return () => window.clearInterval(interval);
  }, [refs, revision, running]);

  useEffect(() => {
    const onVisibilityChange = (): void => {
      const now = performance.now();
      flushRef.current(now);
      const visible = document.visibilityState !== 'hidden';
      refs.visible.current = visible;
      setVisible(visible);
      refs.activeAt.current = visible && !refs.paused.current ? now : null;
    };
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => document.removeEventListener('visibilitychange', onVisibilityChange);
  }, [refs, setVisible]);

  useEffect(() => () => {
    refs.generation.current += 1;
  }, [refs]);

  return flushAt;
}
