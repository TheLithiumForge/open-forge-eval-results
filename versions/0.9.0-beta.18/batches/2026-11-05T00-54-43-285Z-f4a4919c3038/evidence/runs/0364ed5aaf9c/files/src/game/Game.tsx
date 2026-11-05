import { useLayoutEffect, useRef, useState } from 'react';
import { Board } from './board/Board.tsx';
import { Controls } from './controls/Controls.tsx';
import { Reproduction } from './controls/Reproduction.tsx';
import { GameStatus } from './status/GameStatus.tsx';
import type { BoardFocus } from './board/Board.tsx';
import { useGame } from './session/use-game.ts';
import { isWon } from './game.ts';
import { TournamentScreen } from './tournament/Tournament.tsx';
import { LeaveDialog } from './tournament/LeaveDialog.tsx';
import type { LeaveConfirmation } from './tournament/LeaveDialog.tsx';
import { useTournamentHistory } from './tournament/use-history.ts';
import './game.css';

export function Game() {
  const [tournament, setTournament] = useState(false);
  const [visited, setVisited] = useState(false);
  const [event, setEvent] = useState({ message: '', id: 0 });
  const history = useTournamentHistory();
  const controller = useGame(!tournament);
  const { session } = controller;
  const { game } = session;
  const board = useRef<BoardFocus>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const confirmation = useRef<LeaveConfirmation>(null);
  useLayoutEffect(() => {
    if (!tournament && visited) heading.current?.focus();
  }, [tournament, visited]);
  function publish(message: string): void {
    setEvent((previous) => ({ message, id: previous.id + 1 }));
  }
  function openTournament(): void {
    const open = () => {
      controller.synchronize();
      setTournament(true);
      setVisited(true);
      publish('Choose players for a tournament.');
    };
    if (game.started && !isWon(game)) confirmation.current?.ask(open);
    else open();
  }
  function resume(): void {
    board.current?.focusRemembered();
    controller.resume();
  }
  const status = (
    <div className="game-result">
      <p role="status" aria-live="polite" aria-atomic="true">
        <span key={tournament ? event.id : session.announcement}>
          {tournament ? event.message : session.feedback}
        </span>
      </p>
    </div>
  );
  return (
    <main>
      <header>
        <p className="eyebrow">A little focus. A perfect pair.</p>
        <h1>Neon Pairs</h1>
      </header>
      <p className="intro">Reveal two cards. Match their shape and marker to keep the pair.</p>
      {tournament ? (
        <TournamentScreen
          status={status}
          publish={publish}
          history={history}
          confirm={(action) => confirmation.current?.ask(action)}
          leave={() => setTournament(false)}
        />
      ) : (
        <>
          {visited && (
            <h2 className="game-heading" ref={heading} tabIndex={-1}>
              Game
            </h2>
          )}
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
          {status}
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
      <LeaveDialog ref={confirmation} />
    </main>
  );
}
