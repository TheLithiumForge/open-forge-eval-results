import { useEffect, useRef, useState } from 'react';
import { isWon } from './game.ts';
import { Tournament } from './tournament/Tournament.tsx';
import { LeaveDialog } from './tournament/LeaveDialog.tsx';
import { useTournament } from './session/use-tournament.ts';
import { useTournamentHistory } from './session/use-tournament-history.ts';
import { Board } from './board/Board.tsx';
import { Controls } from './controls/Controls.tsx';
import { Reproduction } from './controls/Reproduction.tsx';
import { GameStatus } from './status/GameStatus.tsx';
import type { BoardFocus } from './board/Board.tsx';
import { useGame } from './session/use-game.ts';
import './game.css';

export function Game() {
  const [tournamentOpen, setTournamentOpen] = useState(false);
  const [visited, setVisited] = useState(false);
  const [pending, setPending] = useState<(() => void) | null>(null);
  const controller = useGame(tournamentOpen);
  const history = useTournamentHistory();
  const competition = useTournament(history.save, tournamentOpen);
  const { session } = controller;
  const { game } = session;
  const board = useRef<BoardFocus>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const tournament = competition.session.tournament;
  useEffect(() => {
    if (visited) heading.current?.focus();
  }, [visited, tournamentOpen, competition.session.generation, tournament?.phase]);
  function confirm(action: () => void, needed: boolean): void {
    if (needed) setPending(() => action);
    else action();
  }
  function openTournament(): void {
    confirm(
      () => {
        controller.synchronize();
        setVisited(true);
        setTournamentOpen(true);
      },
      game.started && !isWon(game),
    );
  }
  const output = tournamentOpen ? competition.session : session;
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
      {visited && (
        <h2 ref={heading} tabIndex={-1} className="tournament-heading">
          {tournamentOpen ? 'Tournament' : 'Game'}
        </h2>
      )}
      {!tournamentOpen && (
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
          <span key={`${tournamentOpen}-${output.announcement}`}>{output.feedback}</span>
        </p>
      </div>
      {tournamentOpen ? (
        <Tournament
          controller={competition}
          history={history}
          confirm={confirm}
          back={() => setTournamentOpen(false)}
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
      <LeaveDialog action={pending} dismiss={() => setPending(null)} />
    </main>
  );
}
