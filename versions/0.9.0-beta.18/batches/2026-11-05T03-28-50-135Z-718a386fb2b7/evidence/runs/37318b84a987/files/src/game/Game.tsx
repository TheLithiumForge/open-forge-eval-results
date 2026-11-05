import { useEffect, useRef, useState } from 'react';
import { TournamentScreen } from './tournament/TournamentScreen.tsx';
import { LeaveDialog } from './tournament/LeaveDialog.tsx';
import { isWon } from './game.ts';
import { Board } from './board/Board.tsx';
import { Controls } from './controls/Controls.tsx';
import { Reproduction } from './controls/Reproduction.tsx';
import { GameStatus } from './status/GameStatus.tsx';
import type { BoardFocus } from './board/Board.tsx';
import { useGame } from './session/use-game.ts';
import './game.css';

export function Game() {
  const [tournament, setTournament] = useState(false);
  const [returned, setReturned] = useState(false);
  return tournament ? (
    <TournamentScreen
      back={() => {
        setTournament(false);
        setReturned(true);
      }}
    />
  ) : (
    <SoloGame openTournament={() => setTournament(true)} returned={returned} />
  );
}

function SoloGame({ openTournament, returned }: { openTournament(): void; returned: boolean }) {
  const controller = useGame();
  const { session } = controller;
  const { game } = session;
  const board = useRef<BoardFocus>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const [confirm, setConfirm] = useState(false);
  useEffect(() => {
    if (returned) heading.current?.focus();
  }, [returned]);
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
      <h2 className="game-heading" ref={heading} tabIndex={-1}>
        Game
      </h2>
      <p className="intro">Reveal two cards. Match their shape and marker to keep the pair.</p>
      <Controls
        size={game.size}
        newGame={controller.newGame}
        restart={controller.restart}
        tournament={() => {
          if (game.started && !isWon(game)) setConfirm(true);
          else openTournament();
        }}
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
      {confirm && (
        <LeaveDialog
          keep={() => setConfirm(false)}
          leave={() => {
            setConfirm(false);
            openTournament();
          }}
        />
      )}
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
