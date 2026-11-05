import { useRef, useState } from 'react';
import { isWon } from '../game.ts';
import { decodeSnapshot, encodeSnapshot } from '../snapshot.ts';
import { activateSession, initialSession } from './session.ts';
import { useSessionClock } from './use-session-clock.ts';
import type { Session } from './session.ts';
import type { Result } from '../tournament/rules.ts';

export function useTournamentTurn(
  code: string,
  snapshot: string | null,
  publish: (text: string) => void,
  finish: (result: Result) => void,
) {
  const [session, setSession] = useState(() => {
    const initial = initialSession(code, { size: 4, bestMoves: {} });
    return {
      ...initial,
      game: snapshot ? (decodeSnapshot(snapshot) ?? initial.game) : initial.game,
      paused: true,
    };
  });
  const current = useRef<Session>(session);
  function commit(next: Session): void {
    if (next === current.current) return;
    current.current = next;
    setSession(next);
  }
  const clock = useSessionClock(session, current, commit);
  function activate(index: number): void {
    clock.synchronize();
    const previous = current.current;
    const next = activateSession(previous, index, false);
    commit(next);
    if (next.announcement !== previous.announcement) publish(next.feedback);
    if (!isWon(previous.game) && isWon(next.game))
      finish({ moves: next.game.moves, elapsedMs: next.game.elapsedMs });
  }
  function start(): void {
    clock.reset();
    commit({ ...current.current, paused: false });
  }
  function exportTurn(): string {
    clock.synchronize();
    return encodeSnapshot(current.current.game);
  }
  return { session, activate, start, exportTurn };
}
