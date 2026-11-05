import { useRef, useState } from 'react';
import { isWon } from '../game.ts';
import { activatePlay, initialPlay } from '../session/session.ts';
import { useSessionClock } from '../session/use-session-clock.ts';
import type { PlaySession } from '../session/session.ts';
import type { Attempt } from './rules.ts';

// One player's game in a match. It has no saved size or best to change. Its pause blocks cards
// until Start turn, and the game reports its moves and active time once, at the winning pair.
export function useTurn(
  boardCode: string,
  announce: (text: string) => void,
  finish: (attempt: Attempt) => void,
) {
  const [session, setSession] = useState(() => ({ ...initialPlay(boardCode), paused: true }));
  const current = useRef<PlaySession>(session);

  function commit(next: PlaySession): void {
    if (next === current.current) return;
    current.current = next;
    setSession(next);
  }

  const clock = useSessionClock(session, current, commit);

  function activate(index: number): void {
    clock.synchronize();
    const before = current.current;
    const next = activatePlay(before, index);
    commit(next);
    if (next.announcement !== before.announcement) announce(next.feedback);
    if (next.game !== before.game && isWon(next.game))
      finish({ moves: next.game.moves, elapsedMs: next.game.elapsedMs });
  }

  function start(): void {
    clock.reset();
    commit({ ...current.current, paused: false });
  }

  return { session, activate, start };
}
