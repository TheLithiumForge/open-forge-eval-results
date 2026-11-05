import { useLayoutEffect, useRef, useState } from 'react';
import { Board } from './board/Board.tsx';
import { Controls } from './controls/Controls.tsx';
import { Reproduction } from './controls/Reproduction.tsx';
import { GameStatus } from './status/GameStatus.tsx';
import type { BoardFocus } from './board/Board.tsx';
import { useGame } from './session/use-game.ts';
import { isWon } from './game.ts';
import { Tournament } from './tournament/Tournament.tsx';
import { LeaveDialog } from './tournament/LeaveDialog.tsx';
import { useTournamentHistory } from './tournament/use-history.ts';
import './game.css';

export function Game() {
  const [tournament, setTournament] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [feedback, setFeedback] = useState({ text: '', event: 0 });
  const controller = useGame(!tournament);
  const history = useTournamentHistory();
  const gameHeading = useRef<HTMLHeadingElement>(null);
  const visitedTournament = useRef(false);
  const { session } = controller;
  const { game } = session;
  const board = useRef<BoardFocus>(null);
  useLayoutEffect(() => {
    if (tournament) visitedTournament.current = true;
    else if (visitedTournament.current) gameHeading.current?.focus();
  }, [tournament]);
  function openTournament(): void {
    controller.restart();
    setConfirm(false);
    setTournament(true);
    setFeedback((previous) => ({ text: 'Tournament setup.', event: previous.event + 1 }));
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
      {!tournament && (
        <>
          {visitedTournament.current && (
            <h2 className="game-heading" tabIndex={-1} ref={gameHeading}>
              Game
            </h2>
          )}
          <p className="intro">Reveal two cards. Match their shape and marker to keep the pair.</p>
          <Controls
            size={game.size}
            newGame={controller.newGame}
            restart={controller.restart}
            tournament={() => {
              if (game.started && !isWon(game)) setConfirm(true);
              else openTournament();
            }}
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
          <span key={tournament ? `tournament-${feedback.event}` : session.announcement}>
            {tournament ? feedback.text : session.feedback}
          </span>
        </p>
      </div>
      {tournament ? (
        <Tournament
          history={history}
          publish={(text) => setFeedback((previous) => ({ text, event: previous.event + 1 }))}
          back={() => setTournament(false)}
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
      {confirm && <LeaveDialog keepPlaying={() => setConfirm(false)} leave={openTournament} />}
    </main>
  );
}
