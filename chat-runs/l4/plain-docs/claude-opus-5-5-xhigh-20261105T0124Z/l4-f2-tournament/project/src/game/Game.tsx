import { useCallback, useLayoutEffect, useRef, useState } from 'react';
import { Board } from './board/Board.tsx';
import { BoardHelp } from './board/BoardHelp.tsx';
import { Controls } from './controls/Controls.tsx';
import { Reproduction } from './controls/Reproduction.tsx';
import { GameStatus } from './status/GameStatus.tsx';
import { TournamentScreen } from './tournament/TournamentScreen.tsx';
import type { BoardFocus } from './board/Board.tsx';
import { useGame } from './session/use-game.ts';
import { usePastTournaments } from './tournament/use-past-tournaments.ts';
import './game.css';

const Screen = { game: 'game', tournament: 'tournament' } as const;
type ScreenName = (typeof Screen)[keyof typeof Screen];

export function Game() {
  const [screen, setScreen] = useState<ScreenName>(Screen.game);
  const solo = screen === Screen.game;
  const controller = useGame(solo);
  const { session } = controller;
  const { game } = session;
  const past = usePastTournaments();
  // Tournament status text, such as whose turn it is, shares the page's one live region.
  const [event, setEvent] = useState({ text: '', id: 0 });
  const announce = useCallback((text: string) => setEvent(({ id }) => ({ text, id: id + 1 })), []);
  const board = useRef<BoardFocus>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const returning = useRef(false);
  // Returning replaces the main area, so focus moves to this screen's heading. The first page
  // load keeps the browser's focus.
  useLayoutEffect(() => {
    if (!solo || !returning.current) return;
    returning.current = false;
    heading.current?.focus();
  }, [solo]);
  function resume(): void {
    board.current?.focusRemembered();
    controller.resume();
  }
  function openTournament(): void {
    setEvent(({ id }) => ({ text: '', id }));
    setScreen(Screen.tournament);
  }
  function backToGame(): void {
    returning.current = true;
    setScreen(Screen.game);
  }
  const result = (
    <div className="game-result">
      <p role="status" aria-live="polite" aria-atomic="true">
        <span key={solo ? session.announcement : event.id}>
          {solo ? session.feedback : event.text}
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
      {solo ? (
        <>
          <h2 ref={heading} tabIndex={-1}>
            Solo game
          </h2>
          <p className="intro">Reveal two cards. Match their shape and marker to keep the pair.</p>
          <Controls
            size={game.size}
            newGame={controller.newGame}
            restart={controller.restart}
            openTournament={openTournament}
          />
          <GameStatus
            game={game}
            best={session.preferences.bestMoves[String(game.size)]}
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
      ) : (
        <TournamentScreen result={result} announce={announce} past={past} back={backToGame} />
      )}
    </main>
  );
}
