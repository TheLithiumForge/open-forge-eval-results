import { useEffect, useImperativeHandle, useRef } from 'react';
import { Board } from '../board/Board.tsx';
import type { BoardFocus } from '../board/Board.tsx';
import { isWon } from '../game.ts';
import { formatElapsed } from '../elapsed-time.ts';
import { useGame } from '../session/use-game.ts';
import type { Score } from './rules.ts';
import type { RefObject } from 'react';

export interface TurnHandle {
  snapshot(): string;
}
export function Turn({
  code,
  snapshot,
  finish,
  feedback,
  ref,
}: {
  code: string;
  snapshot: string | null;
  finish(score: Score): void;
  feedback(text: string): void;
  ref: RefObject<TurnHandle | null>;
}) {
  const controller = useGame(code, snapshot);
  const { game } = controller.session;
  const board = useRef<BoardFocus>(null);
  const reported = useRef(false);
  useImperativeHandle(ref, () => ({ snapshot: controller.exportSnapshot }));
  useEffect(() => {
    if (isWon(game) && !reported.current) {
      reported.current = true;
      finish({ moves: game.moves, elapsedMs: game.elapsedMs });
    }
  }, [game, finish]);
  useEffect(() => {
    if (controller.session.feedback) feedback(controller.session.feedback);
  }, [controller.session.announcement]);
  return (
    <>
      <dl className="stats">
        <div>
          <dt>Moves</dt>
          <dd>{game.moves}</dd>
        </div>
        <div>
          <dt>Pairs</dt>
          <dd>
            {game.matched.length / 2}/{game.deck.length / 2}
          </dd>
        </div>
        <div>
          <dt>Time</dt>
          <dd>{formatElapsed(game.elapsedMs)}</dd>
        </div>
      </dl>
      {controller.session.paused && (
        <button
          className="control"
          type="button"
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
      <Board ref={board} game={game} activate={controller.activate} />
    </>
  );
}
