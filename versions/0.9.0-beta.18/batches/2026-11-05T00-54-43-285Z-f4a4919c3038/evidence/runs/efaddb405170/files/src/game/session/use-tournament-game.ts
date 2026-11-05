import { useRef, useState } from 'react';
import { activateSession, initialSession } from './session.ts';
import { useSessionClock } from './use-session-clock.ts';
import type { GameState } from '../game.ts';
import type { Session } from './session.ts';

export function useTournamentGame(
  initial: GameState,
  update: (game: GameState) => void,
  publish: (text: string) => void,
) {
  const [session, setSession] = useState(() => ({
    ...initialSession(initial.boardCode, { size: initial.size, bestMoves: {} }),
    game: initial,
  }));
  const current = useRef(session);
  function commit(next: Session): void {
    if (next === current.current) return;
    const previous = current.current;
    current.current = next;
    setSession(next);
    update(next.game);
    if (next.announcement !== previous.announcement) publish(next.feedback);
  }
  const clock = useSessionClock(session, current, commit);
  return {
    session,
    activate(index: number): void {
      clock.synchronize();
      commit(activateSession(current.current, index, false));
    },
    exportGame(): GameState {
      clock.synchronize();
      return current.current.game;
    },
  };
}
