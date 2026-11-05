import { useEffect, useRef, useState } from 'react';
import { Board } from './board/Board.tsx';
import { BoardHelp } from './board/BoardHelp.tsx';
import { Controls } from './controls/Controls.tsx';
import { Reproduction } from './controls/Reproduction.tsx';
import { GameStatus } from './status/GameStatus.tsx';
import { TournamentScreen } from './tournament/TournamentScreen.tsx';
import type { BoardFocus } from './board/Board.tsx';
import { useGame } from './session/use-game.ts';
import './game.css';

export function Game() {
  const controller = useGame();
  const { session } = controller;
  const { game } = session;
  const board = useRef<BoardFocus>(null);
  const tournamentButton = useRef<HTMLButtonElement>(null);
  const [tournament, setTournament] = useState(false);
  const returning = useRef(false);
  function resume(): void {
    board.current?.focusRemembered();
    controller.resume();
  }
  function openTournament(): void {
    controller.pause();
    setTournament(true);
  }
  function closeTournament(): void {
    returning.current = true;
    setTournament(false);
  }
  // The Tournament button comes back with the game, and the keyboard continues from it.
  useEffect(() => {
    if (tournament || !returning.current) return;
    returning.current = false;
    tournamentButton.current?.focus();
  }, [tournament]);
  return (
    <main>
      <header>
        <p className="eyebrow">A little focus. A perfect pair.</p>
        <h1>Neon Pairs</h1>
      </header>
      {tournament ? (
        <TournamentScreen size={game.size} back={closeTournament} />
      ) : (
        <>
          <p className="intro">Reveal two cards. Match their shape and marker to keep the pair.</p>
          <Controls
            size={game.size}
            newGame={controller.newGame}
            restart={controller.restart}
            openTournament={openTournament}
            tournamentButton={tournamentButton}
          />
          <GameStatus
            game={game}
            best={session.preferences.bestMoves[String(game.size)]}
            celebration={session.celebration}
          />
          <BoardHelp />
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
        </>
      )}
    </main>
  );
}
