import { useEffect, useRef, useState } from 'react';
import { Board } from './board/Board.tsx';
import { Controls } from './controls/Controls.tsx';
import { Reproduction } from './controls/Reproduction.tsx';
import { GameStatus } from './status/GameStatus.tsx';
import { Tournament } from './competition/Tournament.tsx';
import type { BoardFocus } from './board/Board.tsx';
import { useGame } from './session/use-game.ts';
import { useTournament } from './session/use-tournament.ts';
import './game.css';

export function Game() {
  const [screen, setScreen] = useState<'game' | 'tournament'>('game');
  const controller = useGame(screen === 'game');
  const tournament = useTournament(screen === 'tournament');
  const gameHeading = useRef<HTMLHeadingElement>(null);
  const board = useRef<BoardFocus>(null);
  const previousScreen = useRef(screen);
  useEffect(() => {
    if (previousScreen.current !== screen && screen === 'game') gameHeading.current?.focus();
    previousScreen.current = screen;
  }, [screen]);
  function openTournament(): void {
    controller.pauseClock();
    setScreen('tournament');
  }
  function returnToGame(): void {
    tournament.pauseClock();
    tournament.leave();
    controller.resumeClock();
    setScreen('game');
  }
  if (screen === 'tournament') {
    return <Tournament controller={tournament} onReturnToGame={returnToGame} />;
  }

  const { session } = controller;
  const { game } = session;
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
      <h2 ref={gameHeading} tabIndex={-1} className="game-screen-heading">
        Game
      </h2>
      <p className="intro">Reveal two cards. Match their shape and marker to keep the pair.</p>
      <Controls
        size={game.size}
        newGame={controller.newGame}
        openTournament={openTournament}
        restart={controller.restart}
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
      <div className="game-result">
        <p role="status" aria-live="polite" aria-atomic="true">
          <span key={session.announcement}>{session.feedback}</span>
        </p>
      </div>
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
    </main>
  );
}
