import { useRef, useState } from 'react';
import { isWon } from '../game.ts';
import { activateSession, initialSession } from '../session/session.ts';
import { useSessionClock } from '../session/use-session-clock.ts';
import type { GameState } from '../game.ts';
import type { Session } from '../session/session.ts';

// One player's turn. Its preferences stay in memory, so tournament turns never change saved bests.
export function useTurnSession(initial: GameState, finish: (game: GameState) => void) {
  const [session, setSession] = useState(() => ({
    ...initialSession(initial.boardCode, { size: initial.size, bestMoves: {} }),
    game: initial,
  }));
  const current = useRef(session);

  function commit(next: Session): void {
    if (next === current.current) return;
    current.current = next;
    setSession(next);
  }

  const clock = useSessionClock(session, current, commit);

  function activate(index: number): void {
    clock.synchronize();
    const wasWon = isWon(current.current.game);
    commit(activateSession(current.current, index));
    if (!wasWon && isWon(current.current.game)) finish(current.current.game);
  }

  // Rendered state can trail the active clock by a tick.
  function progress(): GameState {
    clock.synchronize();
    return current.current.game;
  }

  return { session, activate, progress };
}
