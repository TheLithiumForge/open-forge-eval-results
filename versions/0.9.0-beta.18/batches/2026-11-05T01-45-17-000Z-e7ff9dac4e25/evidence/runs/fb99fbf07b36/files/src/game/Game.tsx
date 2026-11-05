import { useEffect, useRef, useState } from 'react';
import { Board } from './board/Board.tsx';
import { Controls } from './controls/Controls.tsx';
import { Reproduction } from './controls/Reproduction.tsx';
import { GameStatus } from './status/GameStatus.tsx';
import { Tournament } from './tournament/Tournament.tsx';
import { useTournamentRecords } from './tournament/use-tournament-records.ts';
import type { ReactNode } from 'react';
import type { BoardFocus } from './board/Board.tsx';
import { useGame } from './session/use-game.ts';
import './game.css';

const Screen = { game: 'game', tournament: 'tournament' } as const;

// The page's one live region. A turn owner such as "Now playing: Ada" is part of the same update
// as the latest result, so it is announced with it and stays on screen.
function result(owner: string, feedback: string, announcement: number): ReactNode {
  return (
    <div className="game-result">
      <p id="turn-status" role="status" aria-live="polite" aria-atomic="true">
        {owner && (
          <>
            <span className="turn-owner">{owner}</span>{' '}
          </>
        )}
        <span key={announcement}>{feedback}</span>
      </p>
    </div>
  );
}

export function Game() {
  const [screen, setScreen] = useState<(typeof Screen)[keyof typeof Screen]>(Screen.game);
  // Back to game lands on this screen's h2. The first load keeps the browser's focus.
  const [returned, setReturned] = useState(false);
  // The ordinary game waits, clock included, while the Tournament screen is open.
  const controller = useGame(screen === Screen.tournament);
  const records = useTournamentRecords();
  const { session } = controller;
  const { game } = session;
  const board = useRef<BoardFocus>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    if (returned && screen === Screen.game) heading.current?.focus();
  }, [returned, screen]);
  function resume(): void {
    board.current?.focusRemembered();
    controller.resume();
  }
  function open(next: (typeof Screen)[keyof typeof Screen]): void {
    setReturned(next === Screen.game);
    setScreen(next);
  }
  return (
    <main>
      <header>
        <p className="eyebrow">A little focus. A perfect pair.</p>
        <h1>Neon Pairs</h1>
      </header>
      {screen === Screen.tournament ? (
        <Tournament records={records} result={result} back={() => open(Screen.game)} />
      ) : (
        <>
          <h2 ref={heading} tabIndex={-1} className="screen-title">
            Game
          </h2>
          <p className="intro">Reveal two cards. Match their shape and marker to keep the pair.</p>
          <Controls
            size={game.size}
            newGame={controller.newGame}
            restart={controller.restart}
            openTournament={() => open(Screen.tournament)}
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
          {result('', session.feedback, session.announcement)}
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
    </main>
  );
}
