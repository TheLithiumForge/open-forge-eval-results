import { useRef } from 'react';
import { Board } from './board/Board.tsx';
import { Controls } from './controls/Controls.tsx';
import { Reproduction } from './controls/Reproduction.tsx';
import { GameStatus } from './status/GameStatus.tsx';
import type { BoardFocus } from './board/Board.tsx';
import { useGame } from './session/use-game.ts';
import { useTournamentGame } from './tournament/use-tournament-game.ts';
import { TournamentContent, TournamentHeading } from './tournament/TournamentScreen.tsx';
import { LeaveDialog } from './tournament/LeaveDialog.tsx';
import { TournamentPhase } from './tournament/rules.ts';
import './game.css';

export function Game() {
  const controller = useGame();
  const competition = useTournamentGame(controller);
  const { tournament, playing, returned, heading, activate } = competition;
  const { session } = controller;
  const { game } = session;
  const board = useRef<BoardFocus>(null);
  const event = tournament.tournament;
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
      {tournament.open ? (
        <TournamentHeading
          controller={tournament}
          paused={session.paused}
          startTurn={competition.startTurn}
          leave={competition.leave}
        />
      ) : (
        <>
          {returned && (
            <h2 className="game-heading" ref={heading} tabIndex={-1}>
              Game
            </h2>
          )}
          <Controls
            size={game.size}
            newGame={controller.newGame}
            restart={controller.restart}
            tournament={competition.enter}
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
          <span key={session.announcement}>{session.feedback}</span>
        </p>
      </div>
      {tournament.open ? (
        <TournamentContent
          controller={tournament}
          exportTournament={competition.exportTournament}
          load={competition.load}
          announce={controller.announce}
        >
          {session.competition &&
            !session.paused &&
            event &&
            event.phase !== TournamentPhase.ready &&
            game.boardCode === event.matches[event.currentMatch]?.boardCode && (
              <GameStatus
                game={game}
                best={undefined}
                showBest={false}
                celebration={session.celebration}
              />
            )}
          {playing && (
            <>
              <p id="board-help" className="help">
                Arrow keys move between cards. Enter or Space reveals a card.
              </p>
              <Board key={session.generation} game={game} activate={activate} ref={board} />
            </>
          )}
        </TournamentContent>
      ) : (
        <>
          <Board key={session.generation} game={game} activate={activate} ref={board} />
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
      <LeaveDialog request={competition.request} clear={competition.clearRequest} />
    </main>
  );
}
