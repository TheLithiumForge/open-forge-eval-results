import { useEffect, useRef } from 'react';
import type { RefObject } from 'react';
import { Board } from '../board/Board.tsx';
import type { BoardFocus } from '../board/Board.tsx';
import { isWon } from '../game.ts';
import { useGame } from '../session/use-game.ts';
import { GameStatus } from '../status/GameStatus.tsx';
import type { Result } from './model.ts';
export function Turn({
  code,
  finished,
  snapshot,
  exporter,
  announce,
}: {
  code: string;
  finished(result: Result): void;
  snapshot: string | null;
  exporter: RefObject<(() => string) | null>;
  announce(message: string): void;
}) {
  const { session, activate, loadSnapshot, resume, exportSnapshot } = useGame(code);
  exporter.current = exportSnapshot;
  useEffect(() => {
    if (snapshot) loadSnapshot(snapshot);
  }, []);
  const board = useRef<BoardFocus>(null);
  const reported = useRef(false);
  useEffect(() => {
    if (session.feedback) announce(session.feedback);
  }, [session.announcement]);
  useEffect(() => {
    if (isWon(session.game) && !reported.current) {
      reported.current = true;
      finished({ moves: session.game.moves, elapsedMs: session.game.elapsedMs });
    }
  }, [session.game, finished]);
  return (
    <>
      {session.paused && (
        <button
          className="control"
          type="button"
          onClick={() => {
            board.current?.focusRemembered();
            resume();
          }}
        >
          Resume
        </button>
      )}
      <GameStatus game={session.game} best={undefined} celebration={session.celebration} />
      <p id="board-help" className="help">
        Use a pointer or Tab to enter the board. Arrow keys move between cards. Enter or Space
        reveals a card.
      </p>
      <Board game={session.game} activate={activate} ref={board} />
    </>
  );
}
