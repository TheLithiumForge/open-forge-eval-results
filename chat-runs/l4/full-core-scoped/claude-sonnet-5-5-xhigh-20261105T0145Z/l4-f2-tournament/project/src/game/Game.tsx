import { useEffect, useRef, useState } from 'react';
import { Board } from './board/Board.tsx';
import { BoardHelp } from './board/BoardHelp.tsx';
import { Controls } from './controls/Controls.tsx';
import { Reproduction } from './controls/Reproduction.tsx';
import { GameResult } from './status/GameResult.tsx';
import { GameStatus } from './status/GameStatus.tsx';
import type { BoardFocus } from './board/Board.tsx';
import { useGame } from './session/use-game.ts';
import { TournamentScreen } from './tournament/TournamentScreen.tsx';
import { useRecords } from './tournament/use-records.ts';
import './game.css';

export function Game() {
  const [inTournament, setInTournament] = useState(false);
  // The solo game stays as it is while the tournament screen has the page. Its clock waits.
  const controller = useGame(inTournament);
  const records = useRecords();
  const { session } = controller;
  const { game } = session;
  const board = useRef<BoardFocus>(null);
  const tournamentButton = useRef<HTMLButtonElement>(null);
  const opened = useRef(false);
  // Coming back to the game, focus returns to the button that opened the tournament screen.
  useEffect(() => {
    if (inTournament) opened.current = true;
    else if (opened.current) tournamentButton.current?.focus();
  }, [inTournament]);
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
      {inTournament ? (
        <TournamentScreen
          past={records.past}
          save={records.save}
          close={() => setInTournament(false)}
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
          <GameResult feedback={session.feedback} announcement={session.announcement} />
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
