import { useImperativeHandle, useRef } from 'react';
import { Board } from '../board/Board.tsx';
import { GameStatus } from '../status/GameStatus.tsx';
import { useTournamentGame } from '../session/use-tournament-game.ts';
import type { RefObject } from 'react';
import type { BoardFocus } from '../board/Board.tsx';
import type { GameState } from '../game.ts';

export interface TournamentTurnHandle {
  exportGame(): GameState;
}
interface TurnProps {
  game: GameState;
  ref: RefObject<TournamentTurnHandle | null>;
  update(game: GameState): void;
  publish(text: string): void;
}

export function Turn({ game, ref, update, publish }: TurnProps) {
  const controller = useTournamentGame(game, update, publish);
  const board = useRef<BoardFocus>(null);
  useImperativeHandle(ref, () => ({ exportGame: controller.exportGame }));
  return (
    <>
      <GameStatus game={controller.session.game} best={undefined} celebration={false} />
      <p id="board-help" className="help">
        Arrow keys move between cards. Enter or Space reveals a card.
      </p>
      <Board game={controller.session.game} activate={controller.activate} ref={board} />
    </>
  );
}
