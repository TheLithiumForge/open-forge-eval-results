import { useImperativeHandle, useRef } from 'react';
import { Board } from '../board/Board.tsx';
import { GameStatus } from '../status/GameStatus.tsx';
import { useTournamentGame } from '../session/use-tournament-game.ts';
import type { RefObject } from 'react';
import type { BoardFocus } from '../board/Board.tsx';
import type { GameState } from '../game.ts';

export interface TournamentTurn {
  readGame(): GameState;
}
interface TurnProps {
  code: string;
  restored: GameState | null;
  ref: RefObject<TournamentTurn | null>;
  announce(text: string): void;
  finish(game: GameState, feedback: string): void;
}

export function Turn({ code, restored, ref, announce, finish }: TurnProps) {
  const controller = useTournamentGame(code, restored, announce, finish);
  const board = useRef<BoardFocus>(null);
  const { session } = controller;
  useImperativeHandle(ref, () => ({ readGame: controller.readGame }));
  return (
    <>
      <GameStatus game={session.game} best={undefined} celebration={false} />
      {session.paused && (
        <button
          className="control"
          onClick={() => {
            board.current?.focusRemembered();
            controller.start();
          }}
        >
          Start turn
        </button>
      )}
      <p id="board-help" className="help">
        Arrow keys move between cards. Enter or Space reveals a card.
      </p>
      <Board game={session.game} activate={controller.activate} ref={board} />
    </>
  );
}
