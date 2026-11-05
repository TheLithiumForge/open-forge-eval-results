import { useEffect, useRef } from 'react';
import { Board } from './board/Board.tsx';
import { Controls } from './controls/Controls.tsx';
import { Reproduction } from './controls/Reproduction.tsx';
import { GameStatus } from './status/GameStatus.tsx';
import { useGame } from './session/use-game.ts';
import { isWon } from './game.ts';
import type { ReactNode } from 'react';
import type { BoardFocus } from './board/Board.tsx';

interface SoloGameProps {
  status: ReactNode;
  focus: boolean;
  announce(text: string): void;
  tournament(unfinished: boolean): void;
}

export function SoloGame({ status, focus, announce, tournament }: SoloGameProps) {
  const controller = useGame(announce);
  const { session } = controller;
  const { game } = session;
  const board = useRef<BoardFocus>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    if (focus) heading.current?.focus();
  }, [focus]);
  function resume(): void {
    board.current?.focusRemembered();
    controller.resume();
  }
  return (
    <>
      {focus && (
        <h2 ref={heading} tabIndex={-1}>
          Game
        </h2>
      )}
      <p className="intro">Reveal two cards. Match their shape and marker to keep the pair.</p>
      <Controls
        size={game.size}
        newGame={controller.newGame}
        restart={controller.restart}
        tournament={() => tournament(game.started && !isWon(game))}
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
      {status}
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
    </>
  );
}
