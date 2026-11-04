import { useCallback, useEffect, useRef, useState } from 'react';
import type { MutableRefObject } from 'react';
import { SELECTION } from '../constants';
import { isWon } from '../state';
import type { GameState } from '../types';

type Props = Readonly<{
  paused: boolean;
  revision: number;
  pausedRef: MutableRefObject<boolean>;
  revisionRef: MutableRefObject<number>;
  stateRef: MutableRefObject<GameState>;
  advance: (milliseconds: number) => void;
}>;

export function useActiveClock({ paused, revision, pausedRef, revisionRef, stateRef, advance }: Props): () => void {
  const [visible, setVisible] = useState(() => !document.hidden);
  const advanceRef = useRef(advance);
  const lastNow = useRef(performance.now());
  const active = useRef(visible && !paused);
  advanceRef.current = advance;

  const syncNow = useCallback(() => {
    const now = performance.now();
    if (active.current && !pausedRef.current) {
      const delta = Math.floor(now - lastNow.current);
      if (delta > 0) {
        lastNow.current += delta;
        advanceRef.current(delta);
      }
    } else lastNow.current = now;
  }, []);

  useEffect(() => {
    const onVisibility = () => {
      syncNow();
      const nextVisible = !document.hidden;
      active.current = nextVisible && !pausedRef.current;
      lastNow.current = performance.now();
      setVisible(nextVisible);
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, [syncNow]);

  useEffect(() => {
    lastNow.current = performance.now();
    active.current = visible && !pausedRef.current;
    if (!active.current || isWon(stateRef.current)) return;
    const effectRevision = revision;
    let timer = 0;
    let cancelled = false;
    const tick = () => {
      if (cancelled || revisionRef.current !== effectRevision) return;
      syncNow();
      if (isWon(stateRef.current)) return;
      const selection = stateRef.current.selection;
      const delay = selection.kind === SELECTION.MISMATCH ? Math.min(50, selection.remainingMs) : 50;
      timer = window.setTimeout(tick, delay);
    };
    timer = window.setTimeout(tick, 50);
    return () => { cancelled = true; window.clearTimeout(timer); };
  }, [paused, pausedRef, revision, revisionRef, stateRef, syncNow, visible]);

  return syncNow;
}
