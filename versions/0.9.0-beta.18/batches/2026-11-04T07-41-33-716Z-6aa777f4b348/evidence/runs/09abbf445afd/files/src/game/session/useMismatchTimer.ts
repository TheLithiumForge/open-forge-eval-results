import { useEffect } from 'react';
import type { RefObject } from 'react';
import type { Selection } from '../types.ts';
import type { GameState } from '../types.ts';

export function useMismatchTimer(
  selection: Selection,
  running: boolean,
  revision: number,
  generationRef: RefObject<number>,
  turnNumber: number,
  turnNumberRef: RefObject<number>,
  gameRef: RefObject<GameState>,
  flushAt: (now: number) => void,
): void {
  const mismatchKey = selection.kind === 'mismatch'
    ? `${selection.first}:${selection.second}`
    : '';
  const remainingMs = selection.kind === 'mismatch' ? selection.remainingMs : 0;

  useEffect(() => {
    if (!running || mismatchKey === '') return;
    const generation = generationRef.current;
    const scheduledTurn = turnNumber;
    let timeout: number;
    const tick = (): void => {
      if (generation !== generationRef.current || scheduledTurn !== turnNumberRef.current) return;
      const current = gameRef.current;
      if (current.selection.kind !== 'mismatch') return;
      if (`${current.selection.first}:${current.selection.second}` !== mismatchKey) return;
      flushAt(performance.now());
      const updated = gameRef.current;
      if (updated.selection.kind === 'mismatch') {
        timeout = window.setTimeout(tick, Math.max(1, Math.ceil(updated.selection.remainingMs)));
      }
    };
    timeout = window.setTimeout(tick, Math.max(1, Math.ceil(remainingMs)));
    return () => window.clearTimeout(timeout);
    // Preserve the turn's original deadline as the clock renders updated remaining time.
  }, [flushAt, gameRef, generationRef, mismatchKey, revision, running, turnNumber, turnNumberRef]);
}
