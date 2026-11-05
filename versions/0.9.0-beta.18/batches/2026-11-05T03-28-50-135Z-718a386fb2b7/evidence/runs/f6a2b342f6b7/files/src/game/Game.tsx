import { useLayoutEffect, useRef, useState } from 'react';
import { Board } from './board/Board.tsx';
import { Controls } from './controls/Controls.tsx';
import { Reproduction } from './controls/Reproduction.tsx';
import { GameStatus } from './status/GameStatus.tsx';
import { TournamentScreen } from './tournament/TournamentScreen.tsx';
import { useTournament } from './tournament/use-tournament.ts';
import type { BoardFocus } from './board/Board.tsx';
import { useGame } from './session/use-game.ts';
import './game.css';

export function Game() {
  const [tournamentOpen, setTournamentOpen] = useState(false);
  const tournamentButton = useRef<HTMLButtonElement>(null);
  const returnToTournamentButton = useRef(false);
  const controller = useGame(!tournamentOpen);
  const tournament = useTournament(tournamentOpen);
  const { session } = controller;
  const { game } = session;
  const board = useRef<BoardFocus>(null);
  useLayoutEffect(() => {
    if (!tournamentOpen && returnToTournamentButton.current) {
      tournamentButton.current?.focus();
      returnToTournamentButton.current = false;
    }
  }, [tournamentOpen]);
  function resume(): void {
    board.current?.focusRemembered();
    controller.resume();
  }
  function openTournament(): void {
    controller.suspendClock();
    setTournamentOpen(true);
  }
  function backToGame(): void {
    if (tournament.tournament?.champion) tournament.leave();
    returnToTournamentButton.current = true;
    controller.resetClock();
    setTournamentOpen(false);
  }
  return (
    <main>
      <header>
        <p className="eyebrow">A little focus. A perfect pair.</p>
        <h1>Neon Pairs</h1>
      </header>
      <p className="intro">
        {tournamentOpen
          ? 'Take turns on the same deal, then compare moves and time.'
          : 'Reveal two cards. Match their shape and marker to keep the pair.'}
      </p>
      {tournamentOpen ? (
        <TournamentScreen {...tournament} onBack={backToGame} />
      ) : (
        <>
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
        </>
      )}
    </main>
  );
}
