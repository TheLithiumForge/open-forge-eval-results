import { useRef } from 'react';
import { Board } from './board/Board.tsx';
import { Controls } from './controls/Controls.tsx';
import { Reproduction } from './controls/Reproduction.tsx';
import { GameResult } from './GameResult.tsx';
import { GameStatus } from './status/GameStatus.tsx';
import { useGame } from './session/use-game.ts';
import type { BoardFocus } from './board/Board.tsx';
import type { RefObject } from 'react';

interface SoloGameProps {
  readonly active: boolean;
  readonly tournamentButtonRef: RefObject<HTMLButtonElement | null>;
  openTournament(): void;
}

export function SoloGame({ active, tournamentButtonRef, openTournament }: SoloGameProps) {
  const controller = useGame({ active });
  const { session } = controller;
  const { game } = session;
  const board = useRef<BoardFocus>(null);

  function resume(): void {
    board.current?.focusRemembered();
    controller.resume();
  }

  return (
    <div hidden={!active}>
      <p className="intro">Reveal two cards. Match their shape and marker to keep the pair.</p>
      <Controls
        size={game.size}
        newGame={controller.newGame}
        restart={controller.restart}
        openTournament={openTournament}
        tournamentButtonRef={tournamentButtonRef}
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
      <GameResult text={session.feedback} sequence={session.announcement} />
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
    </div>
  );
}
