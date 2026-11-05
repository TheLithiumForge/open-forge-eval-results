import { useEffect, useRef, useState } from 'react';
import { Board } from './board/Board.tsx';
import { Controls } from './controls/Controls.tsx';
import { Reproduction } from './controls/Reproduction.tsx';
import { GameStatus } from './status/GameStatus.tsx';
import type { BoardFocus } from './board/Board.tsx';
import { useGame } from './session/use-game.ts';
import { Tournament } from './tournament/Tournament.tsx';
import { useHistory } from './tournament/use-history.ts';
import { LeaveDialog } from './controls/LeaveDialog.tsx';
import { isWon } from './game.ts';
import './game.css';

export function Game() {
  const [tournament, setTournament] = useState(false);
  const [returned, setReturned] = useState(false);
  const [action, setAction] = useState<(() => void) | null>(null);
  const [event, setEvent] = useState({ text: '', id: 0 });
  const controller = useGame(!tournament);
  const history = useHistory();
  const { session } = controller;
  const { game } = session;
  const board = useRef<BoardFocus>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    if (!tournament && returned) heading.current?.focus();
  }, [tournament, returned]);
  function publish(text: string): void {
    setEvent((previous) => ({ text, id: previous.id + 1 }));
  }
  function confirm(next: () => void): void {
    setAction(() => next);
  }
  function openTournament(): void {
    const open = () => {
      setTournament(true);
      publish('');
    };
    if (game.started && !isWon(game)) confirm(open);
    else open();
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
          {returned && (
            <h2 className="screen-heading" ref={heading} tabIndex={-1}>
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
          <span key={tournament ? `t:${event.id}` : session.announcement}>
            {tournament ? event.text : session.feedback}
          </span>
        </p>
      </div>
      {tournament ? (
        <Tournament
          history={history}
          publish={publish}
          confirm={confirm}
          back={() => {
            controller.newGame();
            setReturned(true);
            setTournament(false);
          }}
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
      <LeaveDialog action={action} close={() => setAction(null)} />
    </main>
  );
}
