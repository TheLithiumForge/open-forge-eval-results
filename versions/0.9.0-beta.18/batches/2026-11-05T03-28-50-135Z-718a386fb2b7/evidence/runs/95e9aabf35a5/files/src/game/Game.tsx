import { useRef } from 'react';
import { Board } from './board/Board.tsx';
import { Controls } from './controls/Controls.tsx';
import { Reproduction } from './controls/Reproduction.tsx';
import { GameStatus } from './status/GameStatus.tsx';
import type { BoardFocus } from './board/Board.tsx';
import { useGame } from './session/use-game.ts';
import { TournamentScreen } from './tournament/Tournament.tsx';
import { useTournament } from './tournament/use-tournament.ts';
import './game.css';

export function Game() {
  const controller = useGame();
  const tournament = useTournament(controller);
  const { session } = controller;
  const { game } = session;
  const board = useRef<BoardFocus>(null);
  function resume(): void {
    board.current?.focusRemembered();
    controller.resume();
  }
  const gamePanel = (
    <>
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
      {!tournament.open && (
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
      )}
    </>
  );
  return (
    <main>
      <header>
        <p className="eyebrow">A little focus. A perfect pair.</p>
        <h1>Neon Pairs</h1>
      </header>
      <p className="intro">Reveal two cards. Match their shape and marker to keep the pair.</p>
      {!tournament.open && (
        <Controls
          size={game.size}
          newGame={controller.newGame}
          restart={controller.restart}
          tournament={() => tournament.setOpen(true)}
        />
      )}
      {tournament.open && (
        <TournamentScreen
          tournament={tournament.tournament}
          past={tournament.past}
          start={tournament.start}
          startTurn={tournament.beginTurn}
          next={tournament.next}
          leave={tournament.leave}
          showPast={tournament.setTournament}
          exportTournament={tournament.exportTournament}
          load={tournament.load}
        >
          {tournament.tournament?.phase === 'playing' && gamePanel}
        </TournamentScreen>
      )}
      {!tournament.open && gamePanel}
    </main>
  );
}
