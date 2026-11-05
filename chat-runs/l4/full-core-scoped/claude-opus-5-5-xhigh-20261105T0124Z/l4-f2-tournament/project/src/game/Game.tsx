import { useEffect, useRef, useState } from 'react';
import { Board } from './board/Board.tsx';
import { BoardHelp } from './board/BoardHelp.tsx';
import { Controls } from './controls/Controls.tsx';
import { Reproduction } from './controls/Reproduction.tsx';
import { GameStatus } from './status/GameStatus.tsx';
import { TournamentBody } from './tournament/TournamentBody.tsx';
import { TournamentHead } from './tournament/TournamentHead.tsx';
import { useTournament } from './tournament/use-tournament.ts';
import type { BoardFocus } from './board/Board.tsx';
import { useGame } from './session/use-game.ts';
import './game.css';

const Screen = { game: 'game', tournament: 'tournament' } as const;
type Screen = (typeof Screen)[keyof typeof Screen];

// The status paragraph stays mounted between the two screens' halves, so it is the page's one
// live region for solo play and tournaments alike.
export function Game() {
  const [screen, setScreen] = useState<Screen>(Screen.game);
  const [focusRequest, setFocusRequest] = useState(0);
  const heading = useRef<HTMLHeadingElement>(null);
  const controller = useGame(screen === Screen.game);
  const tournament = useTournament(focusHeading);
  const { session } = controller;
  const { game } = session;
  const board = useRef<BoardFocus>(null);
  const solo = screen === Screen.game;
  // A replaced screen sends focus to its heading once it has rendered.
  useEffect(() => {
    if (focusRequest) heading.current?.focus();
  }, [focusRequest]);
  function focusHeading(): void {
    setFocusRequest((request) => request + 1);
  }
  function show(next: Screen): void {
    if (next === Screen.tournament) controller.suspend();
    tournament.reset();
    setScreen(next);
    focusHeading();
  }
  function resume(): void {
    board.current?.focusRemembered();
    controller.resume();
  }
  const status = solo
    ? { key: `game-${session.announcement}`, text: session.feedback }
    : { key: `tournament-${tournament.status.key}`, text: tournament.status.text };
  return (
    <main>
      <header>
        <p className="eyebrow">A little focus. A perfect pair.</p>
        <h1>Neon Pairs</h1>
      </header>
      {solo ? (
        <>
          <h2 ref={heading} tabIndex={-1}>
            Solo game
          </h2>
          <p className="intro">Reveal two cards. Match their shape and marker to keep the pair.</p>
          <Controls
            size={game.size}
            newGame={controller.newGame}
            tournament={() => show(Screen.tournament)}
            restart={controller.restart}
          />
          <GameStatus
            game={game}
            best={{ moves: session.preferences.bestMoves[String(game.size)] }}
            celebration={session.celebration}
          />
          <BoardHelp />
        </>
      ) : (
        <TournamentHead view={tournament} heading={heading} back={() => show(Screen.game)} />
      )}
      <div className="game-result">
        <p role="status" aria-live="polite" aria-atomic="true">
          <span key={status.key}>{status.text}</span>
        </p>
      </div>
      {solo ? (
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
      ) : (
        <TournamentBody view={tournament} leave={() => show(Screen.game)} />
      )}
    </main>
  );
}
