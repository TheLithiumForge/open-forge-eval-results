import { useEffect, useRef } from 'react';
import { advanceGame } from '../state.ts';
import type { GameState } from '../state.ts';

type ClockSession = { game: GameState; paused: boolean; epoch: number };
type ClockProps = { current: () => ClockSession; update: (game: GameState) => void; epoch: number };

export function useGameClock({ current, update, epoch }: ClockProps) {
  const last = useRef(performance.now());
  const shown = useRef(!document.hidden);
  const callbacks = useRef({ current, update });
  callbacks.current = { current, update };

  function sync(): GameState {
    const now = performance.now();
    const session = callbacks.current.current();
    const delta = Math.max(0, Math.floor(now - last.current));
    last.current += delta;
    const next = shown.current && !session.paused ? advanceGame(session.game, delta) : session.game;
    if (next !== session.game) callbacks.current.update(next);
    return next;
  }

  function reset() { last.current = performance.now(); }

  useEffect(() => {
    let live = true;
    let frame = 0;
    const tick = () => {
      if (!live || callbacks.current.current().epoch !== epoch) return;
      sync();
      frame = requestAnimationFrame(tick);
    };
    const visibility = () => {
      if (!live || callbacks.current.current().epoch !== epoch) return;
      sync();
      shown.current = !document.hidden;
      reset();
    };
    shown.current = !document.hidden;
    frame = requestAnimationFrame(tick);
    document.addEventListener('visibilitychange', visibility);
    return () => {
      live = false;
      cancelAnimationFrame(frame);
      document.removeEventListener('visibilitychange', visibility);
    };
  }, [epoch]);

  return { sync, reset };
}
