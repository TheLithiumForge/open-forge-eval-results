import { useEffect, useRef, useState } from 'react';
import { Board } from './board/Board.tsx';
import { BoardHelp } from './board/BoardHelp.tsx';
import { Controls } from './controls/Controls.tsx';
import { Reproduction } from './controls/Reproduction.tsx';
import { GameStatus } from './status/GameStatus.tsx';
import { Tournament } from './tournament/Tournament.tsx';
import { useSavedTournaments } from './tournament/use-saved-tournaments.ts';
import type { BoardFocus } from './board/Board.tsx';
import type { LiveResult } from './tournament/Tournament.tsx';
import { useGame } from './session/use-game.ts';
import './game.css';

export function Game() {
  const controller = useGame();
  const { saved, record } = useSavedTournaments();
  const { session } = controller;
  const { game } = session;
  const board = useRef<BoardFocus>(null);
  const tournamentButton = useRef<HTMLButtonElement>(null);
  const [inTournament, setInTournament] = useState(false);
  const visited = useRef(false);
  // Closing the tournament screen returns focus to the button that opened it.
  useEffect(() => {
    if (inTournament) visited.current = true;
    else if (visited.current) tournamentButton.current?.focus();
  }, [inTournament]);
  function resume(): void {
    board.current?.focusRemembered();
    controller.resume();
  }
  // One polite, atomic live region serves the game and the tournament screen. The tournament
  // screen adds the player whose turn it is.
  function result({ feedback, announcement, now }: LiveResult) {
    return (
      <div className="game-result">
        <p role="status" aria-live="polite" aria-atomic="true">
          {now && (
            <>
              <span className="now-playing">{now}</span>{' '}
            </>
          )}
          <span key={announcement}>{feedback}</span>
        </p>
      </div>
    );
  }
  return (
    <main>
      <header>
        <p className="eyebrow">A little focus. A perfect pair.</p>
        <h1>Neon Pairs</h1>
      </header>
      {inTournament ? (
        <Tournament
          saved={saved}
          record={record}
          result={result}
          back={() => setInTournament(false)}
        />
      ) : (
        <>
          <p className="intro">Reveal two cards. Match their shape and marker to keep the pair.</p>
          <Controls
            size={game.size}
            newGame={controller.newGame}
            restart={controller.restart}
            openTournament={() => setInTournament(true)}
            tournamentButton={tournamentButton}
          />
          <GameStatus
            game={game}
            best={session.preferences.bestMoves[String(game.size)]}
            celebration={session.celebration}
          />
          <BoardHelp />
          {result({ feedback: session.feedback, announcement: session.announcement, now: '' })}
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
