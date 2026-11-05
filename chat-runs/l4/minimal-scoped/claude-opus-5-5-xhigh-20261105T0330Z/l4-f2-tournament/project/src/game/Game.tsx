import { useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import { Board } from './board/Board.tsx';
import { BoardHelp } from './board/BoardHelp.tsx';
import { Controls } from './controls/Controls.tsx';
import { Reproduction } from './controls/Reproduction.tsx';
import { GameStatus } from './status/GameStatus.tsx';
import { Tournament } from './tournament/Tournament.tsx';
import type { BoardFocus } from './board/Board.tsx';
import { useGame } from './session/use-game.ts';
import { useTournament } from './tournament/use-tournament.ts';
import './game.css';

const Screen = { game: 'game', tournament: 'tournament' } as const;
type ScreenName = (typeof Screen)[keyof typeof Screen];

export function Game() {
  const [screen, setScreen] = useState<ScreenName>(Screen.game);
  // The solo game stays in memory behind the Tournament screen, with its active time paused.
  const controller = useGame(screen === Screen.game);
  const tournament = useTournament();
  const { session } = controller;
  const { game } = session;
  const board = useRef<BoardFocus>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  function resume(): void {
    board.current?.focusRemembered();
    controller.resume();
  }
  // Returning replaces the main area, so focus moves to the game's heading.
  function closeTournament(): void {
    flushSync(() => setScreen(Screen.game));
    heading.current?.focus();
  }
  const status = screen === Screen.game ? session : tournament;
  // The page's one live region. Turn results, whose turn it is and load outcomes all go through it.
  const result = (
    <div className="game-result">
      <p id="result-status" role="status" aria-live="polite" aria-atomic="true">
        <span key={status.announcement}>{status.feedback}</span>
      </p>
    </div>
  );
  return (
    <main>
      <header>
        <p className="eyebrow">A little focus. A perfect pair.</p>
        <h1>Neon Pairs</h1>
      </header>
      {screen === Screen.tournament ? (
        <Tournament flow={tournament} result={result} close={closeTournament} />
      ) : (
        <>
          <h2 ref={heading} tabIndex={-1}>
            Solo game
          </h2>
          <p className="intro">Reveal two cards. Match their shape and marker to keep the pair.</p>
          <Controls
            size={game.size}
            newGame={controller.newGame}
            restart={controller.restart}
            openTournament={() => setScreen(Screen.tournament)}
          />
          <GameStatus
            game={game}
            best={session.preferences.bestMoves[String(game.size)] ?? 'none'}
            celebration={session.celebration}
          />
          <BoardHelp />
          {result}
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
