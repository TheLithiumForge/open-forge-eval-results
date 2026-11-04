import { useCallback, useEffect, useRef } from 'react';
import type { RefObject } from 'react';
import { advanceGame } from '../transitions.ts';
import type { Session } from './sessionTypes.ts';

export function useActiveClock(
  current: RefObject<Session>,
  publish: (session: Session) => void,
  dealId: number,
) {
  const anchor = useRef(performance.now());
  const visible = useRef(!document.hidden);
  const generation = useRef(0);

  const synchronize = useCallback(() => {
    const now = performance.now();
    const session = current.current;
    const elapsed = Math.max(0, now - anchor.current);
    anchor.current = now;
    if (!visible.current || session.paused) return;
    const game = advanceGame(session.game, elapsed);
    if (game !== session.game) publish({ ...session, game });
  }, [current, publish]);

  const invalidate = useCallback(() => {
    generation.current += 1;
    anchor.current = performance.now();
    visible.current = !document.hidden;
  }, []);

  useEffect(() => {
    const token = generation.current;
    let frame = 0;
    const tick = () => {
      if (token !== generation.current) return;
      synchronize();
      frame = requestAnimationFrame(tick);
    };
    const visibilityChanged = () => {
      if (token !== generation.current) return;
      synchronize();
      visible.current = !document.hidden;
    };
    frame = requestAnimationFrame(tick);
    document.addEventListener('visibilitychange', visibilityChanged);
    return () => {
      generation.current += 1;
      cancelAnimationFrame(frame);
      document.removeEventListener('visibilitychange', visibilityChanged);
    };
  }, [dealId, synchronize]);

  return { synchronize, invalidate };
}
