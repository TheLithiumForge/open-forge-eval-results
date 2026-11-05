import { useLayoutEffect, useRef, useState } from 'react';
import { Board } from './board/Board.tsx';
import { Controls } from './controls/Controls.tsx';
import { Reproduction } from './controls/Reproduction.tsx';
import { GameStatus } from './status/GameStatus.tsx';
import type { BoardFocus } from './board/Board.tsx';
import { useGame } from './session/use-game.ts';
import { isWon } from './game.ts';
import { Tournament } from './tournament/Tournament.tsx';
import { TournamentPhase } from './tournament/rules.ts';
import { LeaveDialog } from './tournament/LeaveDialog.tsx';
import { useTournament } from './tournament/use-tournament.ts';
import './game.css';

export function Game() {
  const [screen, setScreen] = useState('game');
  const controller = useGame(screen === 'game');
  const tournament = useTournament();
  const [pending, setPending] = useState<(() => void) | null>(null);
  const [announcement, setAnnouncement] = useState({ text: '', id: 0 });
  const heading = useRef<HTMLHeadingElement>(null);
  const previousScreen = useRef(screen);
  const openedTournament = useRef(false);
  const { session } = controller;
  const { game } = session;
  const board = useRef<BoardFocus>(null);
  function publish(text: string): void {
    setAnnouncement((previous) => ({ text, id: previous.id + 1 }));
  }
  function confirm(action: () => void): void {
    const unfinished =
      screen === 'game'
        ? game.started && !isWon(game)
        : tournament.state && tournament.state.phase !== TournamentPhase.complete;
    if (unfinished) setPending(() => action);
    else action();
  }
  useLayoutEffect(() => {
    if (previousScreen.current !== screen && screen === 'game') heading.current?.focus();
    previousScreen.current = screen;
  }, [screen]);
  function resume(): void {
    board.current?.focusRemembered();
    controller.resume();
  }
  function openTournament(): void {
    confirm(() => {
      if (game.started && !isWon(game)) controller.newGame();
      openedTournament.current = true;
      setScreen('tournament');
    });
  }
  return (
    <main>
      <header>
        <p className="eyebrow">A little focus. A perfect pair.</p>
        <h1>Neon Pairs</h1>
      </header>
      {screen === 'game' && (
        <>
          {openedTournament.current && (
            <h2 className="game-heading" ref={heading} tabIndex={-1}>
              Game
            </h2>
          )}
          <p className="intro">Reveal two cards. Match their shape and marker to keep the pair.</p>
          <Controls
            size={game.size}
            newGame={controller.newGame}
            restart={controller.restart}
            tournament={openTournament}
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
        </>
      )}
      <div className="game-result">
        <p role="status" aria-live="polite" aria-atomic="true">
          <span key={screen === 'game' ? session.announcement : announcement.id}>
            {screen === 'game' ? session.feedback : announcement.text}
          </span>
        </p>
      </div>
      {screen === 'tournament' ? (
        <Tournament
          controller={tournament}
          publish={publish}
          confirm={confirm}
          back={() =>
            confirm(() => {
              tournament.clear();
              setScreen('game');
            })
          }
        />
      ) : (
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
      )}
      {pending && (
        <LeaveDialog
          cancel={() => setPending(null)}
          leave={() => {
            const action = pending;
            setPending(null);
            action();
          }}
        />
      )}
    </main>
  );
}
