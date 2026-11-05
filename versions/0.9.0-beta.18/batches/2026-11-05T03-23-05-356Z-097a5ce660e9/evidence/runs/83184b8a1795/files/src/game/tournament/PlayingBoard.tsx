import { useRef } from 'react';
import { Board } from '../board/Board.tsx';
import { GameStatus } from '../status/GameStatus.tsx';
import type { BoardFocus } from '../board/Board.tsx';
import type { Session } from '../session/session.ts';
export function PlayingBoard({
  session,
  activate,
}: {
  session: Session;
  activate(index: number): void;
}) {
  const board = useRef<BoardFocus>(null);
  return (
    <>
      <GameStatus game={session.game} best={undefined} celebration={session.celebration} hideBest />
      <p id="board-help" className="help">
        Use a pointer or Tab to enter the board. Arrow keys move between cards. Enter or Space
        reveals a card.
      </p>
      <Board key={session.generation} game={session.game} activate={activate} ref={board} />
    </>
  );
}
