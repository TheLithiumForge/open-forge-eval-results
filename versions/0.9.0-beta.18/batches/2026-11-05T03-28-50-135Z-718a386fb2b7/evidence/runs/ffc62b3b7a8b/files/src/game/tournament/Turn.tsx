import { useRef } from 'react';
import { Board } from '../board/Board.tsx';
import type { BoardFocus } from '../board/Board.tsx';
import { GameStatus } from '../status/GameStatus.tsx';
import type { useGame } from '../session/use-game.ts';

export function Turn({ controller }: { controller: ReturnType<typeof useGame> }) {
  const board = useRef<BoardFocus>(null);
  return (
    <>
      <GameStatus
        game={controller.session.game}
        best={undefined}
        showBest={false}
        celebration={controller.session.celebration}
      />
      <p id="board-help" className="help">
        Use a pointer or Tab to enter the board. Arrow keys move between cards. Enter or Space
        reveals a card.
      </p>
      <Board
        key={controller.session.generation}
        game={controller.session.game}
        activate={controller.activate}
        ref={board}
      />
    </>
  );
}
