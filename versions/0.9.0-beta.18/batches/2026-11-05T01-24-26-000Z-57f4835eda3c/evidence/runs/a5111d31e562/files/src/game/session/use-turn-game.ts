import { useRef, useState } from 'react';
import { isWon } from '../game.ts';
import { playTurn, startPlay } from './session.ts';
import { useSessionClock } from './use-session-clock.ts';
import type { GameState } from '../game.ts';
import type { Play } from './session.ts';

// Plays one tournament turn on a fixed deal. It has no saved preferences, so the turn can't change
// the saved size or a best. Unmounting the board's owner clears its timer.
export function useTurnGame(
  code: string,
  publish: (feedback: string) => void,
  finish: (game: GameState) => void,
) {
  const [play, setPlay] = useState(() => startPlay(code));
  const current = useRef(play);

  function commit(next: Play): void {
    if (next === current.current) return;
    current.current = next;
    setPlay(next);
  }

  const clock = useSessionClock(play, current, commit, true);

  function activate(index: number): void {
    clock.synchronize();
    const before = current.current;
    const next = playTurn(before, index);
    commit(next);
    if (next.announcement !== before.announcement) publish(next.feedback);
    if (next !== before && isWon(next.game)) finish(next.game);
  }

  return { play, activate };
}
