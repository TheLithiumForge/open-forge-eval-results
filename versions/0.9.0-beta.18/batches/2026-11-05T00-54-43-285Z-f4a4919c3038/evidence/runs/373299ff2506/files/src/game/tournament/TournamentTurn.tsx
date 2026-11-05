import { useImperativeHandle, useLayoutEffect, useRef, useState } from 'react';
import { Board } from '../board/Board.tsx';
import { formatElapsed } from '../elapsed-time.ts';
import { isWon } from '../game.ts';
import { activateSession, initialSession } from '../session/session.ts';
import { useSessionClock } from '../session/use-session-clock.ts';
import type { RefObject } from 'react';
import type { BoardFocus } from '../board/Board.tsx';
import type { GameState } from '../game.ts';
import type { Session } from '../session/session.ts';
import '../status/status.css';

export interface TournamentTurnHandle {
  game(): GameState;
}

interface TournamentTurnProps {
  game: GameState;
  paused: boolean;
  finish(game: GameState): void;
  ref: RefObject<TournamentTurnHandle | null>;
}

export function TournamentTurn({ game: initialGame, paused, finish, ref }: TournamentTurnProps) {
  const [session, setSession] = useState(() => ({
    ...initialSession(initialGame.boardCode, { size: initialGame.size, bestMoves: {} }),
    game: initialGame,
    paused,
  }));
  const current = useRef(session);
  const board = useRef<BoardFocus>(null);
  function commit(next: Session): void {
    current.current = next;
    setSession(next);
  }
  const clock = useSessionClock(session, current, commit);
  useImperativeHandle(ref, () => ({
    game() {
      clock.synchronize();
      return current.current.game;
    },
  }));
  useLayoutEffect(() => {
    if (!session.paused) board.current?.focusRemembered();
  }, [session.paused]);

  function activate(index: number): void {
    clock.synchronize();
    const next = activateSession(current.current, index);
    commit(next);
    if (isWon(next.game)) finish(next.game);
  }

  if (session.paused)
    return (
      <button
        type="button"
        className="control"
        onClick={() => {
          clock.reset();
          commit({ ...current.current, paused: false });
        }}
      >
        Start turn
      </button>
    );
  const { game } = session;
  return (
    <div className="tournament-turn">
      <dl className="stats">
        <div>
          <dt>Moves:</dt> <dd>{game.moves}</dd>
        </div>
        <div>
          <dt>Pairs:</dt>{' '}
          <dd>
            {game.matched.length / 2}/{game.deck.length / 2}
          </dd>
        </div>
        <div>
          <dt>Time:</dt> <dd>{formatElapsed(game.elapsedMs)}</dd>
        </div>
      </dl>
      <p id="board-help" className="help">
        Reveal two cards to find a pair. Arrow keys move between cards. Enter or Space reveals a
        card.
      </p>
      <div className="game-result">
        <p role="status" aria-live="polite" aria-atomic="true">
          <span key={session.announcement}>{session.feedback}</span>
        </p>
      </div>
      <Board game={game} activate={activate} ref={board} />
    </div>
  );
}
