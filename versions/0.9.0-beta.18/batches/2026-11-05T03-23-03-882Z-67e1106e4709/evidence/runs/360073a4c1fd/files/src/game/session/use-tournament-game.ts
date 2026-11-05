import { useRef, useState } from 'react';
import { isWon } from '../game.ts';
import { activateSession, initialSession } from './session.ts';
import { useSessionClock } from './use-session-clock.ts';
import type { GameState } from '../game.ts';
import type { Session } from './session.ts';

export function useTournamentGame(
  code: string,
  restored: GameState | null,
  announce: (text: string) => void,
  finish: (game: GameState, feedback: string) => void,
) {
  const [session, setSession] = useState(() => ({
    ...initialSession(code, { size: 4, bestMoves: {} }),
    ...(restored ? { game: restored, paused: true } : {}),
  }));
  const current = useRef<Session>(session);
  function commit(next: Session): void {
    current.current = next;
    setSession(next);
  }
  const clock = useSessionClock(session, current, commit);
  function activate(index: number): void {
    clock.synchronize();
    const previous = current.current;
    const next = activateSession(previous, index, false);
    commit(next);
    if (isWon(next.game)) finish(next.game, next.feedback);
    else if (next.announcement !== previous.announcement) announce(next.feedback);
  }
  function start(): void {
    clock.reset();
    commit({ ...current.current, paused: false });
  }
  function readGame(): GameState {
    clock.synchronize();
    return current.current.game;
  }
  return { session, activate, start, readGame };
}
