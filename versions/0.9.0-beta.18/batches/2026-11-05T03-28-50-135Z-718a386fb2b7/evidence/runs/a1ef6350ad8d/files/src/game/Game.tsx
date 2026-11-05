import { useRef, useState } from 'react';
import { Board } from './board/Board.tsx';
import { Controls } from './controls/Controls.tsx';
import { Reproduction } from './controls/Reproduction.tsx';
import { GameStatus } from './status/GameStatus.tsx';
import { Tournament } from './Tournament.tsx';
import type { BoardFocus } from './board/Board.tsx';
import { useGame } from './session/use-game.ts';
import './game.css';

export function Game() {
  const controller = useGame();
  const { session } = controller;
  const { game } = session;
  const board = useRef<BoardFocus>(null);
  const [tournamentOpen, setTournamentOpen] = useState(false);
  const suspendedGame = useRef<{ snapshot: string; paused: boolean } | null>(null);
  function resume(): void {
    board.current?.focusRemembered();
    controller.resume();
  }
  function openTournament(): void {
    suspendedGame.current = {
      snapshot: controller.exportSnapshot(),
      paused: controller.session.paused,
    };
    controller.pause();
    setTournamentOpen(true);
  }
  function closeTournament(): void {
    const saved = suspendedGame.current;
    if (saved && controller.loadSnapshot(saved.snapshot) && !saved.paused) controller.resume();
    suspendedGame.current = null;
    setTournamentOpen(false);
  }
  return (
    <main>
      <header>
        <p className="eyebrow">A little focus. A perfect pair.</p>
        <h1>Neon Pairs</h1>
      </header>
      {tournamentOpen ? (
        <Tournament
          game={game}
          feedback={session.feedback}
          announcement={session.announcement}
          activate={(index) => controller.activate(index, false)}
          exportSnapshot={controller.exportSnapshot}
          loadBoard={controller.loadBoard}
          loadSnapshot={controller.loadSnapshot}
          resume={controller.resume}
          leave={closeTournament}
          backToGame={closeTournament}
        />
      ) : (
        <>
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
        </>
      )}
    </main>
  );
}
