import { useImperativeHandle, useRef } from 'react';
import { Board } from '../board/Board.tsx';
import { GameStatus } from '../status/GameStatus.tsx';
import { useGame } from '../session/use-game.ts';
import { isWon } from '../game.ts';
import type { RefObject } from 'react';
import type { BoardFocus } from '../board/Board.tsx';
import type { GameState } from '../game.ts';

export interface TournamentTurnHandle {
  currentGame(): GameState;
}
interface TournamentTurnProps {
  game: GameState;
  ref: RefObject<TournamentTurnHandle | null>;
  completed(game: GameState): void;
  announce(message: string): void;
}

export function TournamentTurn({ game, ref, completed, announce }: TournamentTurnProps) {
  const controller = useGame(game);
  const board = useRef<BoardFocus>(null);
  const { session } = controller;
  const lastAnnouncement = useRef(session.announcement);
  useImperativeHandle(ref, () => ({ currentGame: controller.currentGame }));
  function activate(index: number): void {
    const next = controller.activate(index);
    if (next.announcement !== lastAnnouncement.current && !isWon(next.game))
      announce(next.feedback);
    lastAnnouncement.current = next.announcement;
    completed(next.game);
  }
  return (
    <>
      <GameStatus
        game={session.game}
        best={undefined}
        celebration={session.celebration}
        tournament
      />
      <p id="board-help" className="help">
        Use a pointer or Tab to enter the board. Arrow keys move between cards. Enter or Space
        reveals a card.
      </p>
      <Board game={session.game} ref={board} activate={activate} />
    </>
  );
}
