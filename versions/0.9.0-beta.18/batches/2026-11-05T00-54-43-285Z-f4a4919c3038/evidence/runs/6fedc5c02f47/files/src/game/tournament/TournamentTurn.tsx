import { useEffect, useImperativeHandle, useRef, useState } from 'react';
import { Board } from '../board/Board.tsx';
import { isWon } from '../game.ts';
import { initialSession, activateSession } from '../session/session.ts';
import { useSessionClock } from '../session/use-session-clock.ts';
import { GameStatus } from '../status/GameStatus.tsx';
import type { RefObject } from 'react';
import type { BoardFocus } from '../board/Board.tsx';
import type { GameState } from '../game.ts';
import type { Session } from '../session/session.ts';

export interface TournamentTurnHandle {
  exportGame(): GameState;
}

interface TournamentTurnProps {
  game: GameState;
  finish(game: GameState): void;
  ref: RefObject<TournamentTurnHandle | null>;
}

export function TournamentTurn({ game, finish, ref }: TournamentTurnProps) {
  const [session, setSession] = useState(() => ({
    ...initialSession(game.boardCode, { size: game.size, bestMoves: {} }),
    game,
  }));
  const current = useRef(session);
  const board = useRef<BoardFocus>(null);
  function commit(next: Session): void {
    current.current = next;
    setSession(next);
  }
  const clock = useSessionClock(session, current, commit);
  useImperativeHandle(ref, () => ({
    exportGame() {
      clock.synchronize();
      return current.current.game;
    },
  }));
  const won = isWon(session.game);
  useEffect(() => {
    board.current?.focusRemembered();
  }, []);
  useEffect(() => {
    if (won) finish(current.current.game);
  }, [won, finish]);
  return (
    <div className="tournament-turn">
      <GameStatus game={session.game} best={undefined} celebration={false} showBest={false} />
      <p id="board-help" className="help">
        Reveal two cards. Arrow keys move between cards. Enter or Space reveals a card.
      </p>
      <div className="game-result">
        <p role="status" aria-live="polite" aria-atomic="true">
          <span key={session.announcement}>{session.feedback}</span>
        </p>
      </div>
      <Board
        game={session.game}
        ref={board}
        activate={(index) => {
          clock.synchronize();
          commit(activateSession(current.current, index));
        }}
      />
    </div>
  );
}
