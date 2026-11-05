import { useImperativeHandle, useRef, useState } from 'react';
import { Board } from '../board/Board.tsx';
import { GameStatus } from '../status/GameStatus.tsx';
import { isWon } from '../game.ts';
import { decodeSnapshot, encodeSnapshot } from '../snapshot.ts';
import { activateSession, initialSession } from '../session/session.ts';
import { useSessionClock } from '../session/use-session-clock.ts';
import type { RefObject } from 'react';
import type { BoardFocus } from '../board/Board.tsx';
import type { Session } from '../session/session.ts';
import type { TournamentScore } from './tournament.ts';

export interface TournamentTurnHandle {
  exportSnapshot(): string;
}

interface TournamentTurnProps {
  code: string;
  snapshot: string | null;
  complete(score: TournamentScore): void;
  ref: RefObject<TournamentTurnHandle | null>;
}

export function TournamentTurn({ code, snapshot, complete, ref }: TournamentTurnProps) {
  const [session, setSession] = useState(() => {
    const initial = initialSession(code, { size: Number(code.split('-')[1]), bestMoves: {} });
    const game = snapshot === null ? null : decodeSnapshot(snapshot);
    return game ? { ...initial, game } : initial;
  });
  const current = useRef(session);
  const board = useRef<BoardFocus>(null);
  function commit(next: Session): void {
    if (next === current.current) return;
    current.current = next;
    setSession(next);
  }
  const clock = useSessionClock(session, current, commit);
  useImperativeHandle(ref, () => ({
    exportSnapshot: () => {
      clock.synchronize();
      return encodeSnapshot(current.current.game);
    },
  }));
  function activate(index: number): void {
    clock.synchronize();
    const next = activateSession(current.current, index);
    commit(next);
    if (isWon(next.game))
      complete({ moves: next.game.moves, elapsedMs: Math.floor(next.game.elapsedMs) });
  }
  return (
    <section aria-label="Current turn">
      <GameStatus game={session.game} best={undefined} celebration={false} />
      <p id="board-help" className="help">
        Reveal two cards to find a pair. Arrow keys move between cards. Enter or Space reveals a
        card.
      </p>
      <div className="game-result">
        <p role="status" aria-live="polite" aria-atomic="true">
          <span key={session.announcement}>{session.feedback}</span>
        </p>
      </div>
      <Board game={session.game} activate={activate} ref={board} />
    </section>
  );
}
