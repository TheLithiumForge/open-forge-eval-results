import { useEffect, useRef, useState } from 'react';
import { Board } from './board/Board.tsx';
import { Controls } from './controls/Controls.tsx';
import { Reproduction } from './controls/Reproduction.tsx';
import { GameStatus } from './status/GameStatus.tsx';
import type { BoardFocus } from './board/Board.tsx';
import { useGame } from './session/use-game.ts';
import { TournamentScreen } from './competition/Tournament.tsx';
import './game.css';

export function Game() {
  const [screen, setScreen] = useState<'game' | 'tournament'>('game');
  const controller = useGame({ clockActive: screen === 'game' });
  const { session } = controller;
  const { game } = session;
  const board = useRef<BoardFocus>(null);
  const tournamentButton = useRef<HTMLButtonElement>(null);
  const tournamentHeading = useRef<HTMLHeadingElement>(null);
  const returnFocus = useRef(false);
  useEffect(() => {
    if (screen === 'tournament') tournamentHeading.current?.focus();
    else if (returnFocus.current) {
      returnFocus.current = false;
      tournamentButton.current?.focus();
    }
  }, [screen]);
  function resume(): void {
    board.current?.focusRemembered();
    controller.resume();
  }
  function openTournament(): void {
    controller.synchronize();
    setScreen('tournament');
  }
  function backToGame(): void {
    returnFocus.current = true;
    setScreen('game');
  }
  return (
    <main>
      <header>
        <p className="eyebrow">A little focus. A perfect pair.</p>
        <h1>Neon Pairs</h1>
      </header>
      <section hidden={screen !== 'game'}>
        <p className="intro">Reveal two cards. Match their shape and marker to keep the pair.</p>
        <Controls
          size={game.size}
          newGame={controller.newGame}
          restart={controller.restart}
          openTournament={openTournament}
          tournamentButtonRef={tournamentButton}
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
      </section>
      {screen === 'tournament' && (
        <TournamentScreen onBack={backToGame} headingRef={tournamentHeading} />
      )}
    </main>
  );
}
