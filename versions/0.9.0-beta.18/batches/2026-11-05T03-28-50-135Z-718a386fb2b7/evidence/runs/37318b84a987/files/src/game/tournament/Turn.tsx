import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import { Board } from '../board/Board.tsx';
import { isWon } from '../game.ts';
import { GameStatus } from '../status/GameStatus.tsx';
import { useGame } from '../session/use-game.ts';
import type { BoardFocus } from '../board/Board.tsx';
import type { Result } from './rules.ts';

interface Props {
  code: string;
  snapshot: string | null;
  onResult(result: Result): void;
  onFeedback(text: string, event: number): void;
}
export const Turn = forwardRef<{ snapshot(): string }, Props>(function Turn(
  { code, snapshot, onResult, onFeedback },
  ref,
) {
  const controller = useGame(code);
  const { session } = controller;
  const reported = useRef(false);
  const board = useRef<BoardFocus>(null);
  useImperativeHandle(ref, () => ({ snapshot: controller.exportSnapshot }));
  useEffect(() => {
    if (snapshot) controller.loadSnapshot(snapshot);
  }, []);
  useEffect(() => {
    onFeedback(session.feedback, session.announcement);
  }, [session.feedback, session.announcement]);
  useEffect(() => {
    if (isWon(session.game) && !reported.current) {
      reported.current = true;
      onResult({ moves: session.game.moves, elapsedMs: session.game.elapsedMs });
    }
  }, [session.game, onResult]);
  return (
    <>
      <GameStatus
        game={session.game}
        best={undefined}
        celebration={session.celebration}
        showBest={false}
      />
      {session.paused && (
        <button className="control" type="button" onClick={controller.resume}>
          Resume
        </button>
      )}
      <p id="board-help" className="help">
        Use a pointer or Tab to enter the board. Arrow keys move between cards. Enter or Space
        reveals a card.
      </p>
      <Board
        key={session.generation}
        game={session.game}
        activate={controller.activate}
        ref={board}
      />
    </>
  );
});
