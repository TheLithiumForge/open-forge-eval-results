import { useCallback, useLayoutEffect, useRef } from 'react';
import type { Selection } from '../state.ts';

// All time comes from one monotonic clock. Checkpoints also run before actions,
// so a late render cannot change turn ordering or an exported snapshot.
export function useActiveClock(enabled: boolean, generation: number, phase: Selection['kind'],
  advance: (ms: number) => void, nextDelay: () => number) {
  const clock = useRef({ active: false, last: 0, generation });
  const settle = useCallback(() => {
    const now = performance.now();
    const { active, last } = clock.current;
    clock.current.last = now;
    if (active) advance(Math.max(0, now - last));
  }, [advance]);

  useLayoutEffect(() => {
    let valid = true;
    let timer: ReturnType<typeof setTimeout> | undefined;
    // Activation and Resume checkpoint before rendering. Preserve that instant
    // when starting, so render time is included in active elapsed time.
    const last = enabled && clock.current.generation === generation
      ? clock.current.last : performance.now();
    clock.current = { active: enabled && !document.hidden, last, generation };
    function schedule() {
      const delay = nextDelay() - (performance.now() - clock.current.last);
      if (valid && clock.current.active && Number.isFinite(delay)) {
        timer = setTimeout(tick, Math.max(0, delay));
      }
    }
    function tick() {
      if (!valid) return;
      settle();
      schedule();
    }
    function visibility() {
      if (!valid) return;
      settle();
      if (timer !== undefined) clearTimeout(timer);
      clock.current.active = enabled && !document.hidden;
      schedule();
    }
    document.addEventListener('visibilitychange', visibility);
    schedule();
    return () => {
      valid = false;
      clock.current.active = false;
      if (timer !== undefined) clearTimeout(timer);
      document.removeEventListener('visibilitychange', visibility);
    };
  }, [enabled, generation, phase, settle, nextDelay]);

  return settle;
}
