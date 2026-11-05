import { useEffect, useRef } from 'react';
import { isWon } from '../game.ts';
import { formatElapsed } from '../elapsed-time.ts';
import { Board } from '../board/Board.tsx';
import { BoardHelp } from '../board/BoardHelp.tsx';
import { StatusLabel } from '../status/status-labels.ts';
import { useTurnGame } from './use-turn-game.ts';
import type { BoardFocus } from '../board/Board.tsx';
import type { TurnResult } from './tournament.ts';
import '../status/status.css';

interface TurnBoardProps {
  boardCode: string;
  player: string;
  finished(result: TurnResult): void;
}

// The board of the turn on screen. It stays after the last pair, so both players can see the result.
export function TurnBoard({ boardCode, player, finished }: TurnBoardProps) {
  const { session, activate } = useTurnGame(boardCode, finished);
  const { game } = session;
  const board = useRef<BoardFocus>(null);
  useEffect(() => {
    board.current?.focusRemembered();
  }, []);
  return (
    <>
      <dl className="stats">
        <div>
          <dt>{StatusLabel.moves}</dt> <dd>{game.moves}</dd>
        </div>
        <div>
          <dt>{StatusLabel.pairs}</dt>{' '}
          <dd>
            {game.matched.length / 2}/{game.deck.length / 2}
          </dd>
        </div>
        <div>
          <dt>{StatusLabel.time}</dt> <dd>{formatElapsed(game.elapsedMs)}</dd>
        </div>
      </dl>
      {isWon(game) && (
        <p className="victory">
          {player} finished in {game.moves} moves and {formatElapsed(game.elapsedMs)}.
        </p>
      )}
      <BoardHelp />
      <div className="game-result">
        <p role="status" aria-live="polite" aria-atomic="true">
          <span key={session.announcement}>{session.feedback}</span>
        </p>
      </div>
      <Board game={game} activate={activate} ref={board} />
    </>
  );
}
