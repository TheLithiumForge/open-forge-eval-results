import { useEffect, useRef, useState } from 'react';
import { Board } from './board/Board.tsx';
import { Controls } from './controls/Controls.tsx';
import { Reproduction } from './controls/Reproduction.tsx';
import { GameStatus } from './status/GameStatus.tsx';
import { isWon } from './game.ts';
import { useGame } from './session/use-game.ts';
import { LeaveDialog } from './tournament/LeaveDialog.tsx';
import type { ReactNode } from 'react';
import type { BoardFocus } from './board/Board.tsx';

interface SoloGameProps {
  status(feedback: string, announcement: number): ReactNode;
  focusHeading: boolean;
  openTournament(): void;
}

export function SoloGame({ status, focusHeading, openTournament }: SoloGameProps) {
  const controller = useGame();
  const { session } = controller;
  const { game } = session;
  const board = useRef<BoardFocus>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const [leave, setLeave] = useState<(() => void) | null>(null);
  useEffect(() => {
    if (focusHeading) heading.current?.focus();
  }, [focusHeading]);
  function resume(): void {
    board.current?.focusRemembered();
    controller.resume();
  }
  return (
    <>
      {focusHeading && (
        <h2 className="game-heading" ref={heading} tabIndex={-1}>
          Game
        </h2>
      )}
      <p className="intro">Reveal two cards. Match their shape and marker to keep the pair.</p>
      <Controls
        size={game.size}
        newGame={controller.newGame}
        restart={controller.restart}
        tournament={() => {
          if (game.started && !isWon(game)) setLeave(() => openTournament);
          else openTournament();
        }}
      />
      <GameStatus
        game={game}
        best={session.preferences.bestMoves[String(game.size)]}
        celebration={session.celebration}
      />
      <p id="board-help" className="help">
        Use a pointer or Tab to enter the board. Arrow keys move between cards. Enter or Space
        reveals a card.
      </p>
      {status(session.feedback, session.announcement)}
      <Board key={session.generation} game={game} activate={controller.activate} ref={board} />
      <Reproduction
        game={game}
        generation={session.generation}
        exportSnapshot={controller.exportSnapshot}
        loadBoard={controller.loadBoard}
        loadSnapshot={controller.loadSnapshot}
        notice={session.loadNotice}
        paused={session.paused}
        resume={resume}
      />
      <LeaveDialog leave={leave} close={() => setLeave(null)} />
    </>
  );
}
