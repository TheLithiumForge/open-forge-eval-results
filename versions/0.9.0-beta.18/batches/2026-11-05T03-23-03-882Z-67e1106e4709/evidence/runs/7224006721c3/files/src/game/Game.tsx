import { useEffect, useRef, useState } from 'react';
import { Board } from './board/Board.tsx';
import { Controls } from './controls/Controls.tsx';
import { Reproduction } from './controls/Reproduction.tsx';
import { GameStatus } from './status/GameStatus.tsx';
import type { BoardFocus } from './board/Board.tsx';
import { useGame } from './session/use-game.ts';
import { useTournament } from './session/use-tournament.ts';
import { Tournament } from './tournament/Tournament.tsx';
import { LeaveDialog } from './tournament/LeaveDialog.tsx';
import { TournamentPhase } from './tournament/rules.ts';
import { isWon } from './game.ts';
import './game.css';

export function Game() {
  const [tournamentScreen, setTournamentScreen] = useState(false);
  const [navigated, setNavigated] = useState(false);
  const [pending, setPending] = useState<(() => void) | null>(null);
  const controller = useGame();
  const tournament = useTournament(controller, (action) => setPending(() => action));
  const { session } = controller;
  const { game } = session;
  const owner =
    tournamentScreen &&
    tournament.run &&
    (tournament.run.phase === TournamentPhase.ready ||
      tournament.run.phase === TournamentPhase.playing)
      ? `Now playing: ${tournament.playerName(tournament.run)}`
      : '';
  const feedback =
    owner && session.feedback !== owner ? `${owner}. ${session.feedback}` : session.feedback;
  const board = useRef<BoardFocus>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    if (navigated) heading.current?.focus();
  }, [tournamentScreen, tournament.revision, navigated]);
  function openTournament(): void {
    const open = () => {
      tournament.reset();
      setNavigated(true);
      setTournamentScreen(true);
    };
    if (game.started && !isWon(game)) setPending(() => open);
    else open();
  }
  function leaveTournament(): void {
    const leave = () => {
      controller.newGame(session.preferences.size);
      setTournamentScreen(false);
    };
    if (tournament.run && tournament.run.phase !== TournamentPhase.complete)
      setPending(() => leave);
    else if (!tournament.run && tournament.setup.names.some((name) => name.trim()))
      setPending(() => leave);
    else leave();
  }
  function resume(): void {
    board.current?.focusRemembered();
    controller.resume();
  }
  return (
    <main>
      <header>
        <p className="eyebrow">A little focus. A perfect pair.</p>
        <h1>Neon Pairs</h1>
      </header>
      {navigated && (
        <h2 className="screen-title" tabIndex={-1} ref={heading}>
          {tournamentScreen ? 'Tournament' : 'Game'}
        </h2>
      )}
      {!tournamentScreen && (
        <>
          <p className="intro">Reveal two cards. Match their shape and marker to keep the pair.</p>
          <Controls
            size={game.size}
            newGame={controller.newGame}
            restart={controller.restart}
            tournament={openTournament}
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
        </>
      )}
      <div className="game-result">
        <p role="status" aria-live="polite" aria-atomic="true">
          <span key={session.announcement}>{feedback}</span>
        </p>
      </div>
      {tournamentScreen ? (
        <Tournament tournament={tournament} session={session} leave={leaveTournament} />
      ) : (
        <>
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
      <LeaveDialog action={pending} close={() => setPending(null)} />
    </main>
  );
}
