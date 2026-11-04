import { useEffect, useRef } from "react";
import type { GameState } from "../state.js";

const CLOCK_TICK_MS = 100;

export interface ClockCursor {
  lastTimeMs: number;
  fractionalMs: number;
}

interface ClockOptions {
  readonly started: boolean;
  readonly paused: boolean;
  readonly won: boolean;
  readonly generation: number;
  readonly generationRef: { current: number };
  readonly cursor: { current: ClockCursor };
  readonly flush: { current: () => void };
  readonly read: () => GameState;
  readonly advance: (milliseconds: number) => void;
}

export function useGameClock(options: ClockOptions): void {
  const ports = useRef(options);
  ports.current = options;

  useEffect(() => {
    if (!options.started || options.paused || options.won) return;
    let active = true;
    let timer = 0;
    const token = options.generation;
    const cursor = options.cursor;

    const tick = (throughVisibilityChange = false): void => {
      if (!active || token !== options.generationRef.current) return;
      const now = performance.now();
      if (document.hidden && !throughVisibilityChange) {
        cursor.current.lastTimeMs = now;
        return;
      }
      const total = now - cursor.current.lastTimeMs + cursor.current.fractionalMs;
      const milliseconds = Math.floor(Math.max(0, total));
      cursor.current.lastTimeMs = now;
      cursor.current.fractionalMs = total - milliseconds;
      if (milliseconds > 0) ports.current.advance(milliseconds);
    };

    const schedule = (): void => {
      const selection = ports.current.read().selection;
      const remaining = selection.kind === "mismatch" ? selection.remainingMs : CLOCK_TICK_MS;
      timer = window.setTimeout(loop, Math.max(1, Math.min(CLOCK_TICK_MS, remaining)));
    };

    const loop = (): void => {
      if (!active || token !== options.generationRef.current) return;
      tick();
      schedule();
    };

    const visibilityChanged = (): void => {
      if (document.hidden) {
        tick(true);
        window.clearTimeout(timer);
      } else {
        cursor.current.lastTimeMs = performance.now();
        timer = window.setTimeout(loop, 0);
      }
    };

    options.flush.current = () => tick();
    document.addEventListener("visibilitychange", visibilityChanged);
    schedule();
    return () => {
      active = false;
      window.clearTimeout(timer);
      document.removeEventListener("visibilitychange", visibilityChanged);
      options.flush.current = () => undefined;
    };
  }, [
    options.cursor,
    options.flush,
    options.generation,
    options.generationRef,
    options.paused,
    options.started,
    options.won,
  ]);
}
