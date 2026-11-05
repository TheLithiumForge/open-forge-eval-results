import { useLayoutEffect, useRef, useState } from 'react';
import { Board } from './board/Board.tsx';
import { Controls } from './controls/Controls.tsx';
import { Reproduction } from './controls/Reproduction.tsx';
import { GameStatus } from './status/GameStatus.tsx';
import type { BoardFocus } from './board/Board.tsx';
import { useGame } from './session/use-game.ts';
import { Tournament } from './tournament/Tournament.tsx';
import './game.css';

export function Game() {
  const [screen, setScreen] = useState<'game' | 'tournament'>('game');
  const [focusGameHeading, setFocusGameHeading] = useState(false);
  return (
    <>
      <div hidden={screen !== 'game'}>
        <SoloGame
          active={screen === 'game'}
          focusHeading={focusGameHeading}
          openTournament={() => { setFocusGameHeading(false); setScreen('tournament'); }}
        />
      </div>
      {screen === 'tournament' && (
        <Tournament onBack={() => { setFocusGameHeading(true); setScreen('game'); }} />
      )}
    </>
  );
}

interface SoloGameProps {
  readonly active: boolean;
  readonly focusHeading: boolean;
  readonly openTournament: () => void;
}

function SoloGame({ active, focusHeading, openTournament }: SoloGameProps) {
  const controller = useGame(active);
  const { session } = controller;
  const { game } = session;
  const board = useRef<BoardFocus>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  useLayoutEffect(() => {
    if (focusHeading) heading.current?.focus();
  }, [focusHeading]);
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
      <h2 ref={heading} className="game-title" tabIndex={-1}>Play</h2>
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
