import { useRef } from 'react';
import { Board, BoardHelp } from './board/Board.tsx';
import { Controls } from './controls/Controls.tsx';
import { Reproduction } from './controls/Reproduction.tsx';
import { GameStatus } from './status/GameStatus.tsx';
import { TournamentText } from './tournament/labels.ts';
import { LeaveDialog } from './tournament/LeaveDialog.tsx';
import { TournamentBody, TournamentHeader } from './tournament/TournamentScreen.tsx';
import { useTournament } from './tournament/use-tournament.ts';
import type { BoardFocus } from './board/Board.tsx';
import { useGame } from './session/use-game.ts';
import './game.css';

// The game and tournament screens share the header and the one status line between their
// parts. The status line keeps its place, so it stays mounted while the screens change.
export function Game() {
  const controller = useGame();
  const tournament = useTournament(controller);
  const { session } = controller;
  const { game } = session;
  const board = useRef<BoardFocus>(null);
  function resume(): void {
    board.current?.focusRemembered();
    controller.resume();
  }
  const open = tournament.state.open;
  return (
    <main>
      <header>
        <p className="eyebrow">A little focus. A perfect pair.</p>
        <h1>Neon Pairs</h1>
      </header>
      {open ? (
        <TournamentHeader controller={tournament} session={session} />
      ) : (
        <>
          <h2 ref={tournament.focus.gameHeading} tabIndex={-1}>
            {TournamentText.gameHeading}
          </h2>
          <p className="intro">Reveal two cards. Match their shape and marker to keep the pair.</p>
          <Controls
            size={game.size}
            newGame={controller.newGame}
            restart={controller.restart}
            openTournament={tournament.openScreen}
          />
          <GameStatus
            game={game}
            best={session.preferences.bestMoves[String(game.size)]}
            celebration={session.celebration}
          />
          <BoardHelp />
        </>
      )}
      <div className="game-result">
        <p role="status" aria-live="polite" aria-atomic="true">
          <span key={session.announcement}>{session.feedback}</span>
        </p>
      </div>
      {open ? (
        <TournamentBody controller={tournament} session={session} />
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
      <LeaveDialog
        question={tournament.state.leaving}
        keepPlaying={tournament.keepPlaying}
        leave={tournament.confirmLeave}
      />
    </main>
  );
}
