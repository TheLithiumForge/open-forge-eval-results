import { useEffect, useRef, useState } from 'react';
import { Board } from './board/Board.tsx';
import { Controls } from './controls/Controls.tsx';
import { Reproduction } from './controls/Reproduction.tsx';
import { GameStatus } from './status/GameStatus.tsx';
import type { BoardFocus } from './board/Board.tsx';
import { useGame } from './session/use-game.ts';
import { isWon } from './game.ts';
import { useTournament } from './tournament/use-tournament.ts';
import { TournamentScreen } from './tournament/TournamentScreen.tsx';
import { LeaveDialog } from './tournament/LeaveDialog.tsx';
import { TournamentPhase } from './tournament/model.ts';
import { currentMatchIndex, currentPlayerName, tournamentRound } from './tournament/pairing.ts';
import './game.css';

export function Game() {
  const controller = useGame();
  const { session } = controller;
  const { game } = session;
  const board = useRef<BoardFocus>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const [tournamentOpen, setTournamentOpen] = useState(false);
  const [visited, setVisited] = useState(false);
  const [pendingLeave, setPendingLeave] = useState<(() => void) | null>(null);
  const [status, setStatus] = useState({ text: '', event: 0 });
  function publish(text: string): void {
    setStatus((previous) => ({ text, event: previous.event + 1 }));
  }
  const tournament = useTournament(publish);
  const { phase } = tournament.state;
  const index = currentMatchIndex(tournament.state);
  const focusToken = tournamentOpen
    ? `${phase === TournamentPhase.turnEnd || phase === TournamentPhase.matchEnd ? 'playing' : phase}-${index}-${tournament.session.generation}`
    : 'game';
  useEffect(() => {
    heading.current?.focus();
  }, [focusToken]);

  function confirmLeave(action: () => void, unfinished: boolean): void {
    if (unfinished) setPendingLeave(() => action);
    else action();
  }
  function openTournament(): void {
    confirmLeave(
      () => {
        controller.restart();
        tournament.reset();
        publish('');
        setVisited(true);
        setTournamentOpen(true);
      },
      game.started && !isWon(game),
    );
  }
  function unfinishedTournament(): boolean {
    return (
      phase !== TournamentPhase.complete &&
      (phase !== TournamentPhase.setup || tournament.state.names.some((name) => name.trim()))
    );
  }
  function leaveTournament(): void {
    confirmLeave(() => {
      tournament.reset();
      setTournamentOpen(false);
    }, unfinishedTournament());
  }
  function loadTournament(text: string): string {
    const result = tournament.load(text);
    if ('error' in result) return result.error;
    confirmLeave(() => tournament.accept(result.state), unfinishedTournament());
    return '';
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
      <p className="intro">Reveal two cards. Match their shape and marker to keep the pair.</p>
      {(tournamentOpen || visited) && (
        <h2 ref={heading} tabIndex={-1} className="screen-title">
          {tournamentOpen
            ? phase === TournamentPhase.complete
              ? 'Tournament complete'
              : 'Tournament'
            : 'Game'}
        </h2>
      )}
      {tournamentOpen && phase !== TournamentPhase.setup && phase !== TournamentPhase.complete && (
        <div className="tournament-context">
          <p>Round: {tournamentRound(tournament.state.names.length, index).name}</p>
          <p>Now playing: {currentPlayerName(tournament.state)}</p>
        </div>
      )}
      {!tournamentOpen && (
        <>
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
      {tournamentOpen && phase !== TournamentPhase.setup && phase !== TournamentPhase.complete && (
        <p id="board-help" className="help">
          Use a pointer or Tab to enter the board. Arrow keys move between cards. Enter or Space
          reveals a card.
        </p>
      )}
      <div className="game-result">
        <p role="status" aria-live="polite" aria-atomic="true">
          <span key={tournamentOpen ? `t-${status.event}` : `s-${session.announcement}`}>
            {tournamentOpen ? status.text : session.feedback}
          </span>
        </p>
      </div>
      {tournamentOpen ? (
        <TournamentScreen
          controller={tournament}
          leave={leaveTournament}
          load={loadTournament}
          publish={publish}
        />
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
      <LeaveDialog leave={pendingLeave} close={() => setPendingLeave(null)} />
    </main>
  );
}
