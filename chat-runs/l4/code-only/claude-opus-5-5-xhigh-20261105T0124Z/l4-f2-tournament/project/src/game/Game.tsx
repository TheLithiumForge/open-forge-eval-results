import { useRef } from 'react';
import { Board } from './board/Board.tsx';
import { BoardHelp } from './board/BoardHelp.tsx';
import { Controls } from './controls/Controls.tsx';
import { Reproduction } from './controls/Reproduction.tsx';
import { GameResult } from './status/GameResult.tsx';
import { GameStatus } from './status/GameStatus.tsx';
import { Masthead } from './Masthead.tsx';
import type { BoardFocus } from './board/Board.tsx';
import { useGame } from './session/use-game.ts';
import './game.css';

interface GameProps {
  // True when the player comes back from a tournament, so focus returns to its button.
  focusTournament: boolean;
  openTournament(size: number): void;
}

export function Game({ focusTournament, openTournament }: GameProps) {
  const controller = useGame();
  const { session } = controller;
  const { game } = session;
  const board = useRef<BoardFocus>(null);
  function resume(): void {
    board.current?.focusRemembered();
    controller.resume();
  }
  return (
    <main>
      <Masthead />
      <p className="intro">Reveal two cards. Match their shape and marker to keep the pair.</p>
      <Controls
        size={game.size}
        newGame={controller.newGame}
        restart={controller.restart}
        focusTournament={focusTournament}
        openTournament={() => openTournament(game.size)}
      />
      <GameStatus
        game={game}
        best={session.preferences.bestMoves[String(game.size)]}
        celebration={session.celebration}
      />
      <BoardHelp />
      <GameResult feedback={session.feedback} announcement={session.announcement} />
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
    </main>
  );
}
