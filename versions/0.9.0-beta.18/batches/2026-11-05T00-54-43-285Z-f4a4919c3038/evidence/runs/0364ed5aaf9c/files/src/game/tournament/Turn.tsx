import { useImperativeHandle, useRef, useState } from 'react';
import type { RefObject } from 'react';
import { Board } from '../board/Board.tsx';
import type { BoardFocus } from '../board/Board.tsx';
import type { GameState } from '../game.ts';
import { isWon } from '../game.ts';
import { GameStatus } from '../status/GameStatus.tsx';
import { activateSession, initialSession } from '../session/session.ts';
import type { Session } from '../session/session.ts';
import { useSessionClock } from '../session/use-session-clock.ts';

export interface TournamentTurnHandle {
  snapshot(): GameState;
}
interface TurnProps {
  game: GameState;
  ref: RefObject<TournamentTurnHandle | null>;
  finish(game: GameState): void;
  publish(message: string): void;
}

export function TournamentTurn({ game, ref, finish, publish }: TurnProps) {
  const [session, setSession] = useState(() => ({
    ...initialSession(game.boardCode, { size: game.size, bestMoves: {} }),
    game,
  }));
  const current = useRef(session);
  const board = useRef<BoardFocus>(null);
  function commit(next: Session): void {
    if (next === current.current) return;
    const previous = current.current;
    current.current = next;
    setSession(next);
    if (previous.announcement !== next.announcement) publish(next.feedback);
    if (!isWon(previous.game) && isWon(next.game)) finish(next.game);
  }
  const clock = useSessionClock(session, current, commit);
  useImperativeHandle(ref, () => ({
    snapshot() {
      clock.synchronize();
      return current.current.game;
    },
  }));
  return (
    <>
      <GameStatus game={session.game} best={undefined} celebration={false} showBest={false} />
      <p id="board-help" className="help">
        Use a pointer or Tab to enter the board. Arrow keys move between cards. Enter or Space
        reveals a card.
      </p>
      <Board
        game={session.game}
        ref={board}
        activate={(index) => {
          clock.synchronize();
          commit(activateSession(current.current, index));
        }}
      />
    </>
  );
}
