import { useEffect, useRef, useState } from 'react';
import { Board } from './board/Board.tsx';
import { Controls } from './controls/Controls.tsx';
import { Reproduction } from './controls/Reproduction.tsx';
import { GameStatus } from './status/GameStatus.tsx';
import type { BoardFocus } from './board/Board.tsx';
import { useGame } from './session/use-game.ts';
import { TournamentScreen } from './tournament/TournamentScreen.tsx';
import './game.css';

export function Game() {
  const [screen, setScreen] = useState<'game' | 'tournament'>('game');
  const controller = useGame(screen === 'game');
  const { session } = controller;
  const { game } = session;
  const board = useRef<BoardFocus>(null);
  const title = useRef<HTMLHeadingElement>(null);
  const previousScreen = useRef(screen);

  useEffect(() => {
    if (previousScreen.current === 'tournament' && screen === 'game') title.current?.focus();
    previousScreen.current = screen;
  }, [screen]);

  function openTournament(): void {
    controller.pauseForTournament();
    setScreen('tournament');
  }

  function backToGame(): void {
    controller.resumeFromTournament();
    setScreen('game');
  }

  function resume(): void {
    board.current?.focusRemembered();
    controller.resume();
  }
  if (screen === 'tournament') {
    return (
      <main>
        <header>
          <p className="eyebrow">A little focus. A perfect pair.</p>
          <h1>Neon Pairs</h1>
        </header>
        <TournamentScreen backToGame={backToGame} />
      </main>
    );
  }
  return (
    <main>
      <header>
        <p className="eyebrow">A little focus. A perfect pair.</p>
        <h1 ref={title} tabIndex={-1}>
          Neon Pairs
        </h1>
      </header>
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
