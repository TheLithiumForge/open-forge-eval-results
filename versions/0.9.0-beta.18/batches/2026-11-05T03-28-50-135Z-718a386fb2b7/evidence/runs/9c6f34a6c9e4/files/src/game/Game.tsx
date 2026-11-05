import { useEffect, useRef, useState } from 'react';
import { Board } from './board/Board.tsx';
import { Controls } from './controls/Controls.tsx';
import { Reproduction } from './controls/Reproduction.tsx';
import { GameStatus } from './status/GameStatus.tsx';
import type { BoardFocus } from './board/Board.tsx';
import { useGame } from './session/use-game.ts';
import { TournamentScreen } from './TournamentScreen.tsx';
import './game.css';

export function Game() {
  const controller = useGame();
  const { session } = controller;
  const { game } = session;
  const board = useRef<BoardFocus>(null);
  const [tournamentOpen, setTournamentOpen] = useState(false);
  const resumeAfterTournament = useRef(false);
  const wasInTournament = useRef(false);
  function resume(): void {
    board.current?.focusRemembered();
    controller.resume();
  }
  function openTournament(): void {
    resumeAfterTournament.current = !session.paused;
    controller.pause();
    setTournamentOpen(true);
  }
  function backToGame(): void {
    setTournamentOpen(false);
    if (resumeAfterTournament.current) controller.resume();
    resumeAfterTournament.current = false;
  }
  useEffect(() => {
    if (!tournamentOpen && wasInTournament.current) board.current?.focusRemembered();
    wasInTournament.current = tournamentOpen;
  }, [tournamentOpen]);
  return (
    <main>
      <header>
        <p className="eyebrow">A little focus. A perfect pair.</p>
        <h1>Neon Pairs</h1>
      </header>
      <div hidden={tournamentOpen}>
        <p className="intro">Reveal two cards. Match their shape and marker to keep the pair.</p>
        <Controls
          size={game.size}
          newGame={controller.newGame}
          openTournament={openTournament}
          restart={controller.restart}
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
        <div className="game-result">
          <p role="status" aria-live="polite" aria-atomic="true">
            <span key={session.announcement}>{session.feedback}</span>
          </p>
        </div>
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
      {tournamentOpen && (
        <TournamentScreen size={game.size} boardCode={game.boardCode} backToGame={backToGame} />
      )}
    </main>
  );
}
