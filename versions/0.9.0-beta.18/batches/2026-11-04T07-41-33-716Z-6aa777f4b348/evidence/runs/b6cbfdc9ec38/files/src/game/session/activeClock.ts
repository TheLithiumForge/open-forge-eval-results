import type { ClockPorts } from './model.ts';

export function createActiveClock(
  ports: ClockPorts, advance: (milliseconds: number) => void, nextDelay: () => number | null,
) {
  let connected = false;
  let hidden = ports.isHidden();
  let previous = ports.now();
  let generation = 0;
  let cancelTimer: (() => void) | null = null;
  let stopWatching: (() => void) | null = null;

  function sample(): void {
    const current = ports.now();
    if (connected && !hidden) advance(Math.max(0, current - previous));
    previous = current;
  }

  function refresh(): void {
    generation += 1;
    cancelTimer?.();
    cancelTimer = null;
    const delay = nextDelay();
    if (!connected || hidden || delay === null) return;
    const expectedGeneration = generation;
    cancelTimer = ports.schedule(() => {
      if (!connected || generation !== expectedGeneration) return;
      sample();
      refresh();
    }, delay);
  }

  function reset(): void {
    previous = ports.now();
    refresh();
  }

  function connect(): () => void {
    connected = true;
    hidden = ports.isHidden();
    previous = ports.now();
    stopWatching = ports.watchVisibility(() => {
      sample();
      hidden = ports.isHidden();
      refresh();
    });
    refresh();
    return () => {
      sample();
      connected = false;
      generation += 1;
      cancelTimer?.();
      stopWatching?.();
      cancelTimer = null;
      stopWatching = null;
    };
  }

  return { sample, refresh, reset, connect };
}
