import { useLayoutEffect, useRef } from 'react';
import { Board } from '../board/Board.tsx';
import { BoardHelp } from '../board/BoardHelp.tsx';
import { GameStatus } from '../status/GameStatus.tsx';
import { useTurnGame } from '../session/use-turn-game.ts';
import type { BoardFocus } from '../board/Board.tsx';
import type { GameState } from '../game.ts';

interface TournamentTurnProps {
  code: string;
  publish(feedback: string): void;
  finish(game: GameState): void;
}

// One player's game on the match deal. Start turn mounts it, so focus moves to the board's first
// card as the Start turn button goes away.
export function TournamentTurn({ code, publish, finish }: TournamentTurnProps) {
  const { play, activate } = useTurnGame(code, publish, finish);
  const board = useRef<BoardFocus>(null);
  useLayoutEffect(() => {
    board.current?.focusRemembered();
  }, []);
  return (
    <>
      <GameStatus game={play.game} celebration={play.celebration} />
      <BoardHelp />
      <Board game={play.game} activate={activate} ref={board} />
    </>
  );
}
