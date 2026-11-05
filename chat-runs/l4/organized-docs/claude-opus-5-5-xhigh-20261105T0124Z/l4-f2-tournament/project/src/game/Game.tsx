import { useRef } from 'react';
import { Board } from './board/Board.tsx';
import { BoardHelp } from './board/BoardHelp.tsx';
import { Controls } from './controls/Controls.tsx';
import { Reproduction } from './controls/Reproduction.tsx';
import { GameStatus } from './status/GameStatus.tsx';
import { LeaveDialog } from './tournament/LeaveDialog.tsx';
import { TournamentHeader } from './tournament/TournamentHeader.tsx';
import { TournamentPlay } from './tournament/TournamentPlay.tsx';
import { championText, LeaveQuestion } from './tournament/tournament-labels.ts';
import { LeaveKind, useTournament } from './tournament/use-tournament.ts';
import type { BoardFocus } from './board/Board.tsx';
import { useGame } from './session/use-game.ts';
import './game.css';

export function Game() {
  const controller = useGame();
  const { session } = controller;
  const { game } = session;
  const board = useRef<BoardFocus>(null);
  const tournament = useTournament(controller, board);
  const champion = tournament.open ? tournament.champion : null;
  function resume(): void {
    board.current?.focusRemembered();
    controller.resume();
  }
  // The Tournament screen replaces the parts above and below the live region, which stays mounted.
  return (
    <main>
      <header>
        <p className="eyebrow">A little focus. A perfect pair.</p>
        <h1>Neon Pairs</h1>
      </header>
      {tournament.open ? (
        <TournamentHeader screen={tournament} game={game} celebration={session.celebration} />
      ) : (
        <>
          <p className="intro">Reveal two cards. Match their shape and marker to keep the pair.</p>
          <Controls
            size={game.size}
            newGame={controller.newGame}
            restart={controller.restart}
            tournament={tournament.enter}
            tournamentButton={tournament.refs.tournament}
          />
          <GameStatus
            game={game}
            best={session.preferences.bestMoves[String(game.size)]}
            showBest
            celebration={session.celebration}
          />
          <BoardHelp />
        </>
      )}
      <div className="game-result">
        <p role="status" aria-live="polite" aria-atomic="true">
          <span key={session.announcement}>
            {session.feedback}
            {session.feedback && champion && ' '}
            {champion && <span className="champion">{championText(champion)}</span>}
          </span>
        </p>
      </div>
      {tournament.open ? (
        <TournamentPlay
          screen={tournament}
          game={game}
          generation={session.generation}
          board={board}
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
      {tournament.leaving && (
        <LeaveDialog
          question={
            tournament.leaving === LeaveKind.game ? LeaveQuestion.game : LeaveQuestion.tournament
          }
          keep={tournament.keep}
          leave={tournament.leave}
        />
      )}
    </main>
  );
}
