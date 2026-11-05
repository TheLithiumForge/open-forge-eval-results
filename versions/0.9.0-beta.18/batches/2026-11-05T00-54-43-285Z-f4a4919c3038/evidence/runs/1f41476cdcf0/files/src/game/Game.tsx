import { useLayoutEffect, useRef, useState } from 'react';
import { Board } from './board/Board.tsx';
import { Controls } from './controls/Controls.tsx';
import { Reproduction } from './controls/Reproduction.tsx';
import { GameStatus } from './status/GameStatus.tsx';
import { isWon } from './game.ts';
import { useGame } from './session/use-game.ts';
import { useTournament } from './session/use-tournament.ts';
import { TournamentHeader } from './tournament/TournamentHeader.tsx';
import { TournamentBracket } from './tournament/TournamentBracket.tsx';
import { TournamentTools } from './tournament/TournamentTools.tsx';
import { TournamentPhase } from './tournament/types.ts';
import { LeaveDialog } from './tournament/LeaveDialog.tsx';
import type { BoardFocus } from './board/Board.tsx';
import './game.css';
import './tournament/tournament.css';

export function Game() {
  const [inTournament, setInTournament] = useState(false);
  const [visited, setVisited] = useState(false);
  const [leaveAction, setLeaveAction] = useState<(() => void) | null>(null);
  const controller = useGame(!inTournament);
  const competition = useTournament(inTournament);
  const { tournament } = competition;
  const { session } = controller;
  const { game } = session;
  const board = useRef<BoardFocus>(null);
  const tournamentBoard = useRef<BoardFocus>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const phase = tournament?.phase;
  const match = tournament?.matchIndex;
  const turn = tournament?.turn;
  const tournamentPaused = inTournament && competition.session.paused;
  useLayoutEffect(() => {
    if (visited) heading.current?.focus();
  }, [inTournament, visited, phase, match, turn, tournamentPaused]);
  function replace(action: () => void): void {
    const unfinished = inTournament
      ? tournament && tournament.phase !== TournamentPhase.complete
      : game.started && !isWon(game);
    if (unfinished) setLeaveAction(() => action);
    else action();
  }
  function openTournament(): void {
    replace(() => {
      controller.synchronize();
      competition.reset();
      setVisited(true);
      setInTournament(true);
    });
  }
  function back(): void {
    competition.reset();
    setInTournament(false);
  }
  function resume(): void {
    board.current?.focusRemembered();
    controller.resume();
  }
  const feedback = inTournament ? competition.event.text : session.feedback;
  const announcement = inTournament ? `t-${competition.event.id}` : `g-${session.announcement}`;
  return (
    <main>
      <header>
        <p className="eyebrow">A little focus. A perfect pair.</p>
        <h1>Neon Pairs</h1>
      </header>
      {inTournament ? (
        <TournamentHeader
          controller={competition}
          heading={heading}
          back={back}
          leave={() => replace(competition.reset)}
        />
      ) : (
        <>
          {visited && (
            <h2 tabIndex={-1} ref={heading}>
              Game
            </h2>
          )}
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
          <span key={announcement}>{feedback}</span>
        </p>
      </div>
      {inTournament ? (
        <div className="tournament-content">
          {phase === TournamentPhase.playing && !competition.session.paused && (
            <Board
              key={competition.session.generation}
              game={competition.session.game}
              activate={competition.activate}
              ref={tournamentBoard}
            />
          )}
          {tournament && <TournamentBracket tournament={tournament} />}
          <TournamentTools controller={competition} replace={replace} />
        </div>
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
      <LeaveDialog leave={leaveAction} close={() => setLeaveAction(null)} />
    </main>
  );
}
