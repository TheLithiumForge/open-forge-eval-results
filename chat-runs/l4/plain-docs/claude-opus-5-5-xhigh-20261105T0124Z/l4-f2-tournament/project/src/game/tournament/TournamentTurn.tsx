import { useLayoutEffect, useRef } from 'react';
import { isWon } from '../game.ts';
import { Board } from '../board/Board.tsx';
import { BoardHelp } from '../board/BoardHelp.tsx';
import { GameStatus } from '../status/GameStatus.tsx';
import { TournamentControl } from './tournament-labels.ts';
import { useTurn } from './use-turn.ts';
import type { ReactNode } from 'react';
import type { BoardFocus } from '../board/Board.tsx';
import type { Attempt } from './rules.ts';

interface TournamentTurnProps {
  boardCode: string;
  focusStart: boolean;
  after: ReactNode;
  announce(text: string): void;
  finish(attempt: Attempt): void;
}

// Shows the board closed until Start turn. Once the game ends, its board stays for the group to
// see beside the next action.
export function TournamentTurn({
  boardCode,
  focusStart,
  after,
  announce,
  finish,
}: TournamentTurnProps) {
  const { session, activate, start } = useTurn(boardCode, announce, finish);
  const board = useRef<BoardFocus>(null);
  const startButton = useRef<HTMLButtonElement>(null);
  // Next turn and Next match disappear, so their focus moves to the new Start turn button.
  useLayoutEffect(() => {
    if (focusStart) startButton.current?.focus();
  }, [focusStart]);
  function begin(): void {
    // Like Resume, the board takes focus before Start turn disappears.
    board.current?.focusRemembered();
    start();
  }
  const ended = isWon(session.game) && after;
  return (
    <>
      <GameStatus game={session.game} best={null} celebration={session.celebration} />
      {(session.paused || ended) && (
        <div className="tournament-actions">
          {session.paused && (
            <button ref={startButton} type="button" className="control" onClick={begin}>
              {TournamentControl.startTurn}
            </button>
          )}
          {ended}
        </div>
      )}
      <BoardHelp />
      <Board game={session.game} activate={activate} ref={board} />
    </>
  );
}
