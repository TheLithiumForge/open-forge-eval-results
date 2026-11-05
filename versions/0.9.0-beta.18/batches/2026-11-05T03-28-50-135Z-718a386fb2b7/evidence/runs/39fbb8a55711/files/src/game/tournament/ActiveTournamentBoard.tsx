import { useEffect, useRef } from 'react';
import { isWon } from '../game.ts';
import type { GameState } from '../game.ts';
import { formatElapsed } from '../elapsed-time.ts';
import { Board } from '../board/Board.tsx';
import type { BoardFocus } from '../board/Board.tsx';

interface ActiveTournamentBoardProps {
  activate(index: number): void;
  game: GameState;
  generation: number;
  playing: boolean;
}

export function ActiveTournamentBoard({
  activate,
  game,
  generation,
  playing,
}: ActiveTournamentBoardProps) {
  const board = useRef<BoardFocus>(null);

  useEffect(() => {
    if (playing) board.current?.focusRemembered();
  }, [playing]);

  return (
    <>
      <p id="board-help" className="help">
        Use a pointer or Tab to enter the board. Arrow keys move between cards. Enter or Space
        reveals a card.
      </p>
      <dl className="stats tournament-stats">
        <div>
          <dt>Moves</dt> <dd>{game.moves}</dd>
        </div>
        <div>
          <dt>Pairs</dt>{' '}
          <dd>
            {game.matched.length / 2}/{game.deck.length / 2}
          </dd>
        </div>
        <div>
          <dt>Time</dt> <dd>{formatElapsed(game.elapsedMs)}</dd>
        </div>
      </dl>
      {isWon(game) && (
        <p className="victory">
          Every pair found in {game.moves} moves and {formatElapsed(game.elapsedMs)}.
        </p>
      )}
      <Board key={generation} game={game} activate={activate} ref={board} />
    </>
  );
}
