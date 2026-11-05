import { useLayoutEffect, useRef, useState } from 'react';
import { Board } from './board/Board.tsx';
import { Controls } from './controls/Controls.tsx';
import { Reproduction } from './controls/Reproduction.tsx';
import { GameStatus } from './status/GameStatus.tsx';
import type { BoardFocus } from './board/Board.tsx';
import { Tournament } from './competition/Tournament.tsx';
import { useGame } from './session/use-game.ts';
import './game.css';

export function Game() {
  const [screen, setScreen] = useState<'game' | 'tournament'>('game');
  const [tournamentFeedback, setTournamentFeedback] = useState('');
  const [tournamentAnnouncement, setTournamentAnnouncement] = useState(0);
  const controller = useGame(screen === 'game');
  const { session } = controller;
  const { game } = session;
  const board = useRef<BoardFocus>(null);
  const screenHeading = useRef<HTMLHeadingElement | null>(null);
  const previousScreen = useRef(screen);

  useLayoutEffect(() => {
    if (previousScreen.current === screen) return;
    screenHeading.current?.focus();
    previousScreen.current = screen;
  }, [screen]);

  function resume(): void {
    board.current?.focusRemembered();
    controller.resume();
  }
  function announceTournament(message: string): void {
    setTournamentFeedback(message);
    setTournamentAnnouncement((value) => value + 1);
  }
  function openTournament(): void {
    setTournamentFeedback('');
    setTournamentAnnouncement((value) => value + 1);
    setScreen('tournament');
  }

  const statusText = screen === 'game' ? session.feedback : tournamentFeedback;
  const statusKey =
    screen === 'game' ? `game-${session.announcement}` : `tournament-${tournamentAnnouncement}`;
  return (
    <main>
      <header>
        <p className="eyebrow">A little focus. A perfect pair.</p>
        <h1>Neon Pairs</h1>
      </header>
      <p className="intro">Reveal two cards. Match their shape and marker to keep the pair.</p>
      <div className="game-result">
        <p role="status" aria-live="polite" aria-atomic="true">
          <span id="tournament-announcement" key={statusKey}>
            {statusText}
          </span>
        </p>
      </div>
      {screen === 'game' ? (
        <section aria-labelledby="play-heading">
          <h2 id="play-heading" ref={screenHeading} tabIndex={-1}>
            Play
          </h2>
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
      ) : (
        <Tournament
          headingRef={screenHeading}
          onAnnouncement={announceTournament}
          onBack={() => setScreen('game')}
        />
      )}
    </main>
  );
}
