import { useEffect, useImperativeHandle, useRef } from 'react';
import { Board } from '../board/Board.tsx';
import { GameStatus } from '../status/GameStatus.tsx';
import { isWon } from '../game.ts';
import { useGame } from '../session/use-game.ts';
import type { Ref } from 'react';
import type { BoardFocus } from '../board/Board.tsx';
import type { Score } from './tournament.ts';

interface Props {
  code: string;
  snapshot: string | null;
  finished(score: Score): void;
  ref: Ref<{ exportSnapshot(): string }>;
}

export function TournamentTurn({ code, snapshot, finished, ref }: Props) {
  const controller = useGame();
  const { game } = controller.session;
  const board = useRef<BoardFocus>(null);
  const initialized = useRef(false);
  const reported = useRef(false);
  useImperativeHandle(ref, () => ({ exportSnapshot: controller.exportSnapshot }));
  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    if (snapshot) {
      controller.loadSnapshot(snapshot);
      controller.resume();
    } else controller.loadBoard(code);
  }, []);
  useEffect(() => {
    if (!initialized.current || reported.current || game.boardCode !== code || !isWon(game)) return;
    reported.current = true;
    finished({ moves: game.moves, elapsedMs: Math.floor(game.elapsedMs) });
  }, [game, code, finished]);
  if (game.boardCode !== code) return null;
  return (
    <>
      <GameStatus game={game} best={undefined} celebration={controller.session.celebration} />
      <p id="board-help" className="help">
        Use a pointer or Tab to enter the board. Arrow keys move between cards. Enter or Space
        reveals a card.
      </p>
      <div className="game-result">
        <p role="status" aria-live="polite" aria-atomic="true">
          {controller.session.feedback}
        </p>
      </div>
      <Board
        key={controller.session.generation}
        game={game}
        activate={controller.activate}
        ref={board}
      />
    </>
  );
}
