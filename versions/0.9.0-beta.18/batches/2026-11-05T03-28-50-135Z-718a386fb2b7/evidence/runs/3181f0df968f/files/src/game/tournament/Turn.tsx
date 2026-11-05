import { useEffect, useRef } from 'react';
import { Board } from '../board/Board.tsx';
import type { BoardFocus } from '../board/Board.tsx';
import { isWon } from '../game.ts';
import { useGame } from '../session/use-game.ts';
import { GameStatus } from '../status/GameStatus.tsx';
import type { Result } from './rules.ts';

export function Turn({
  code,
  snapshot,
  finish,
  capture,
  announce,
}: {
  code: string;
  snapshot: string | null;
  finish(result: Result): void;
  capture(callback: (() => string) | null): void;
  announce(text: string): void;
}) {
  const controller = useGame({ code, snapshot });
  const { session } = controller;
  const board = useRef<BoardFocus>(null);
  const finished = useRef(false);
  useEffect(() => {
    capture(controller.exportSnapshot);
    return () => capture(null);
  }, []);
  useEffect(() => {
    if (session.feedback) announce(session.feedback);
  }, [session.announcement]);
  useEffect(() => {
    if (isWon(session.game) && !finished.current) {
      finished.current = true;
      finish({ moves: session.game.moves, elapsedMs: session.game.elapsedMs });
    }
  }, [session.game]);
  return (
    <>
      <GameStatus game={session.game} best={undefined} celebration={session.celebration} />
      {session.paused && (
        <button
          className="control"
          onClick={() => {
            board.current?.focusRemembered();
            controller.resume();
          }}
        >
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
}
