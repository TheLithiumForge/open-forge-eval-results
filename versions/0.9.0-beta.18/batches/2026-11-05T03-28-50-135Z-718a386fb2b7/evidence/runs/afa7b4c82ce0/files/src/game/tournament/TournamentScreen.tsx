import { useRef } from 'react';
import { Board } from '../board/Board.tsx';
import { GameStatus } from '../status/GameStatus.tsx';
import { currentMatch, currentPlayer } from './tournament.ts';
import { useTournament } from './use-tournament.ts';
import { TournamentSetup } from './TournamentSetup.tsx';
import { Bracket } from './Bracket.tsx';
import type { BoardFocus } from '../board/Board.tsx';
import './tournament.css';

export function TournamentScreen({ back }: { back(): void }) {
  const {
    controller,
    count,
    setCount,
    names,
    setNames,
    tournament,
    setTournament,
    history,
    json,
    setJson,
    notice,
    setNotice,
    exportTournament,
    loadTournament,
    startTurn,
    advanceMatch,
  } = useTournament();
  const { session } = controller;
  const board = useRef<BoardFocus>(null);
  const match = tournament ? currentMatch(tournament) : null;
  const champion = tournament?.phase === 'complete' ? tournament.rounds.at(-1)?.[0]?.winner : null;
  return (
    <main>
      <header>
        <p className="eyebrow">A little focus. A perfect pair.</p>
        <h1>Tournament</h1>
      </header>
      <p className="tournament-rule">
        Each player plays the same deal. Fewer moves wins; ties go to the faster time, then the
        first player.
      </p>
      {!tournament ? (
        <>
          <TournamentSetup
            count={count}
            setCount={setCount}
            names={names}
            setNames={setNames}
            setTournament={setTournament}
            history={history}
            size={session.game.size}
            setNotice={setNotice}
            back={back}
          />
        </>
      ) : (
        <>
          {champion !== null && champion !== undefined ? (
            <p className="champion">Champion: {tournament.names[champion]}</p>
          ) : (
            match &&
            tournament.phase !== 'matchFinished' && (
              <p className="now-playing">Now playing: {tournament.names[currentPlayer(match)]}</p>
            )
          )}
          {tournament.phase === 'ready' && (
            <button type="button" className="control" onClick={startTurn}>
              Start turn
            </button>
          )}
          {tournament.phase === 'playing' && (
            <>
              {session.paused && (
                <button
                  type="button"
                  className="control"
                  onClick={() => {
                    controller.resume();
                    board.current?.focusRemembered();
                  }}
                >
                  Resume turn
                </button>
              )}
              <GameStatus game={session.game} best={undefined} celebration={session.celebration} />
              <p id="board-help" className="help">
                Use a pointer or Tab to enter the board. Arrow keys move between cards. Enter or
                Space reveals a card.
              </p>
              <div className="game-result">
                <p role="status" aria-live="polite" aria-atomic="true">
                  <span key={session.announcement}>{session.feedback}</span>
                </p>
              </div>
              <Board
                key={session.generation}
                game={session.game}
                activate={controller.activate}
                ref={board}
              />
            </>
          )}
          {tournament.phase === 'turnFinished' && (
            <button
              type="button"
              className="control"
              onClick={() => setTournament({ ...tournament, phase: 'ready' })}
            >
              Next turn
            </button>
          )}
          {tournament.phase === 'matchFinished' && (
            <button type="button" className="control" onClick={advanceMatch}>
              Next match
            </button>
          )}
          {tournament.phase === 'complete' ? (
            <button type="button" className="control" onClick={back}>
              Back to game
            </button>
          ) : (
            <button
              type="button"
              className="control tournament-leave"
              onClick={() => {
                setTournament(null);
                setNotice('');
              }}
            >
              Leave tournament
            </button>
          )}
          <Bracket tournament={tournament} />
        </>
      )}
      <section className="tournament-section tournament-json">
        <h2>Tournament JSON</h2>
        <label htmlFor="tournament-json">Tournament JSON</label>
        <textarea
          id="tournament-json"
          className="control"
          rows={5}
          value={json}
          onChange={(event) => setJson(event.currentTarget.value)}
          spellCheck={false}
        />
        <div className="control-row">
          <button type="button" className="control" onClick={exportTournament}>
            Export tournament
          </button>
          <button type="button" className="control" onClick={loadTournament}>
            Load tournament
          </button>
        </div>
        <p role="status">{notice}</p>
      </section>
    </main>
  );
}
