import { useRef, useState } from 'react';
import { createGame, isWon } from '../game.ts';
import { decodeSnapshot, encodeSnapshot } from '../snapshot.ts';
import { activateSession, initialSession, replaceGame } from '../session/session.ts';
import { useSessionClock } from '../session/use-session-clock.ts';
import type { Session } from '../session/session.ts';
import type { Result } from './model.ts';

export function useTournamentGame(onWin: (result: Result) => void) {
  const [session, setSession] = useState(() =>
    initialSession('np1-4-1', { size: 4, bestMoves: {} }),
  );
  const current = useRef(session);
  function commit(next: Session) {
    current.current = next;
    setSession(next);
  }
  const clock = useSessionClock(session, current, commit);
  function start(code: string, snapshot: string | null) {
    const game = snapshot ? decodeSnapshot(snapshot) : createGame(code);
    if (!game) return;
    clock.reset();
    commit({ ...replaceGame(current.current, game, false), paused: false });
  }
  function activate(index: number) {
    clock.synchronize();
    const before = current.current;
    const next = activateSession(before, index);
    commit(next);
    if (!isWon(before.game) && isWon(next.game))
      onWin({ moves: next.game.moves, elapsedMs: next.game.elapsedMs });
  }
  function exportGame() {
    clock.synchronize();
    return encodeSnapshot(current.current.game);
  }
  function stop() {
    clock.reset();
    commit({ ...current.current, paused: true });
  }
  return { session, start, activate, exportGame, stop };
}
