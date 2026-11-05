import { useRef, useState } from 'react';
import { parseBoardCode } from '../deck.ts';
import { isWon } from '../game.ts';
import { activateSession, initialSession } from '../session/session.ts';
import { DEFAULT_SIZE } from '../session/storage.ts';
import { useSessionClock } from '../session/use-session-clock.ts';
import type { Session } from '../session/session.ts';
import type { TurnResult } from './tournament.ts';

// One player's game of a match deal. It is not the player's own game, so it keeps no best moves.
export function useTurnGame(boardCode: string, finished: (result: TurnResult) => void) {
  const [session, setSession] = useState(() =>
    initialSession(boardCode, {
      size: parseBoardCode(boardCode)?.size ?? DEFAULT_SIZE,
      bestMoves: {},
    }),
  );
  const current = useRef(session);

  function commit(next: Session): void {
    if (next === current.current) return;
    current.current = next;
    setSession(next);
  }

  const clock = useSessionClock(session, current, commit);

  function activate(index: number): void {
    clock.synchronize();
    const before = current.current;
    const next = activateSession(before, index);
    commit(next);
    if (isWon(next.game) && !isWon(before.game))
      finished({ moves: next.game.moves, elapsedMs: Math.floor(next.game.elapsedMs) });
  }

  return { session, activate };
}
