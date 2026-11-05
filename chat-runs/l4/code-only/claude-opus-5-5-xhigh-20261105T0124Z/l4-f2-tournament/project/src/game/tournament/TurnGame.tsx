import { useEffect, useImperativeHandle, useRef } from 'react';
import { Board } from '../board/Board.tsx';
import { GameStatus } from '../status/GameStatus.tsx';
import { useTurnSession } from './use-turn-session.ts';
import type { RefObject } from 'react';
import type { BoardFocus } from '../board/Board.tsx';
import type { GameState } from '../game.ts';

export interface TurnProgress {
  progress(): GameState;
}

interface TurnGameProps {
  initial: GameState;
  finish(game: GameState): void;
  ref: RefObject<TurnProgress | null>;
}

// Mounts when a player selects Start turn, so focus moves straight to the board.
export function TurnGame({ initial, finish, ref }: TurnGameProps) {
  const { session, activate, progress } = useTurnSession(initial, finish);
  const board = useRef<BoardFocus>(null);
  useImperativeHandle(ref, () => ({ progress }));
  useEffect(() => {
    board.current?.focusRemembered();
  }, []);
  return (
    <>
      <GameStatus game={session.game} best={null} celebration={session.celebration} />
      <p id="board-help" className="help">
        Use a pointer or Tab to enter the board. Arrow keys move between cards. Enter or Space
        reveals a card.
      </p>
      <div className="game-result">
        <p role="status" aria-live="polite" aria-atomic="true">
          <span key={session.announcement}>{session.feedback}</span>
        </p>
      </div>
      <Board game={session.game} activate={activate} ref={board} />
    </>
  );
}
