import { useCallback, useEffect, useRef, useState, type MutableRefObject } from 'react';
import { advanceGame, isWon, SELECTION_KIND, type GameState } from '../state.ts';
import { accumulateMilliseconds } from './whole-time.ts';

export interface SessionClock {
  flush(): GameState;
  reset(): void;
}

export function useSessionClock(
  game: GameState,
  gameRef: MutableRefObject<GameState>,
  pausedRef: MutableRefObject<boolean>,
  revisionRef: MutableRefObject<number>,
  paused: boolean,
  revision: number,
  commit: (game: GameState) => void,
): SessionClock {
  const lastNow = useRef(0);
  const remainder = useRef(0);
  const visible = useRef(false);
  const deadline = useRef({ key: '', at: 0 });
  const [visibilityVersion, setVisibilityVersion] = useState(0);
  const flushRevision = useCallback((expectedRevision: number): GameState => {
    if (expectedRevision !== revisionRef.current) return gameRef.current;
    const now = performance.now();
    const delta = Math.max(0, now - lastNow.current);
    lastNow.current = now;
    const current = gameRef.current;
    if (!visible.current || pausedRef.current || !current.started || isWon(current)) return current;

    const chunk = accumulateMilliseconds(delta, remainder.current);
    remainder.current = chunk.remainder;
    if (chunk.wholeMilliseconds > 0) {
      const next = advanceGame(current, chunk.wholeMilliseconds);
      if (next !== current) commit(next);
    }
    return gameRef.current;
  }, [commit, gameRef, pausedRef, revisionRef]);

  const flush = useCallback(() => flushRevision(revisionRef.current), [flushRevision, revisionRef]);

  const reset = useCallback(() => {
    lastNow.current = performance.now();
    remainder.current = 0;
  }, []);

  useEffect(() => {
    const expectedRevision = revision;
    lastNow.current = performance.now();
    remainder.current = 0;
    visible.current = !document.hidden;
    const interval = window.setInterval(() => flushRevision(expectedRevision), 100);

    const onVisibilityChange = () => {
      if (expectedRevision !== revisionRef.current) return;
      flushRevision(expectedRevision);
      visible.current = !document.hidden;
      lastNow.current = performance.now();
      setVisibilityVersion((value) => value + 1);
    };
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [flushRevision, revision, revisionRef]);

  useEffect(() => {
    const selection = game.selection;
    if (selection.kind !== SELECTION_KIND.mismatch || paused || !visible.current) {
      deadline.current = { key: '', at: 0 };
      return;
    }
    const key = `${revision}:${selection.first}:${selection.second}`;
    if (deadline.current.key !== key) {
      deadline.current = { key, at: lastNow.current + selection.remainingMs - remainder.current };
    }
    let cancelled = false;
    let timer = 0;
    const schedule = () => {
      const delay = Math.max(0, deadline.current.at - performance.now());
      timer = window.setTimeout(() => {
        if (cancelled) return;
        flushRevision(revision);
        if (cancelled || revision !== revisionRef.current || !visible.current || pausedRef.current) return;
        const current = gameRef.current.selection;
        if (current.kind !== SELECTION_KIND.mismatch || deadline.current.key !== key) return;
        if (current.remainingMs > 0) {
          deadline.current = { key, at: lastNow.current + current.remainingMs - remainder.current };
          schedule();
        }
      }, delay);
    };
    schedule();
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [flushRevision, game, gameRef, paused, pausedRef, revision, revisionRef, visibilityVersion]);

  return { flush, reset };
}
