import { useRef } from 'react';
import { Board } from '../board/Board.tsx';
import { formatElapsed } from '../elapsed-time.ts';
import { TournamentPhase, matchWinner, tournamentRound } from './rules.ts';
import { Setup } from './Setup.tsx';
import { Bracket } from './Bracket.tsx';
import { Exchange } from './Exchange.tsx';
import type { useTournament } from '../session/use-tournament.ts';
import type { Session } from '../session/session.ts';
import type { BoardFocus } from '../board/Board.tsx';
import './tournament.css';

interface TournamentProps {
  tournament: ReturnType<typeof useTournament>;
  session: Session;
  leave(): void;
}

export function Tournament({ tournament, session, leave }: TournamentProps) {
  const board = useRef<BoardFocus>(null);
  const { run, setup, history } = tournament;
  const playing = run?.phase === TournamentPhase.playing;
  const complete = run?.phase === TournamentPhase.complete;
  const match = run?.event.matches[run.matchIndex];
  const result = match?.results.at(-1);
  const winner = run ? matchWinner(run.event, run.matchIndex) : null;
  return (
    <div className="tournament">
      {!run && (
        <>
          <p>Play a knockout tournament on one device. Each opponent plays the same deal.</p>
          <p className="help">
            Fewer moves wins. Ties use active time, then seed. Entry order sets seeds.
          </p>
          <Setup setup={setup} update={tournament.updateSetup} start={tournament.start} />
        </>
      )}
      {run && (
        <>
          <p>Round: {tournamentRound(run.event.players.length, run.matchIndex).name}</p>
          {run.phase === TournamentPhase.ready && (
            <button type="button" className="control" onClick={tournament.startTurn}>
              Start turn
            </button>
          )}
          {playing && (
            <>
              <dl className="stats">
                <div>
                  <dt>Moves:</dt> <dd>{session.game.moves}</dd>
                </div>
                <div>
                  <dt>Pairs:</dt>{' '}
                  <dd>
                    {session.game.matched.length / 2}/{session.game.deck.length / 2}
                  </dd>
                </div>
                <div>
                  <dt>Time:</dt> <dd>{formatElapsed(session.game.elapsedMs)}</dd>
                </div>
              </dl>
              <p id="board-help" className="help">
                Use a pointer or Tab to enter the board. Arrow keys move between cards. Enter or
                Space reveals a card.
              </p>
              <Board
                key={session.generation}
                game={session.game}
                activate={tournament.activate}
                ref={board}
              />
            </>
          )}
          {result && !playing && run.phase !== TournamentPhase.ready && (
            <p className={`victory${session.celebration ? ' celebrate' : ''}`}>
              Every pair found in {result.moves} moves and {formatElapsed(result.elapsedMs)}.
            </p>
          )}
          {run.phase === TournamentPhase.turnResult && (
            <button type="button" className="control" onClick={tournament.next}>
              Next turn
            </button>
          )}
          {run.phase === TournamentPhase.matchResult && (
            <>
              <p>Winner: {winner == null ? '' : run.event.players[winner - 1]}</p>
              <button type="button" className="control" onClick={tournament.next}>
                Next match
              </button>
            </>
          )}
          {complete && (
            <p className="tournament-champion">
              Champion: {winner == null ? '' : run.event.players[winner - 1]}
            </p>
          )}
          <Bracket event={run.event} />
        </>
      )}
      <div className="tournament-actions">
        <button type="button" className="control" onClick={leave}>
          {!run || complete ? 'Back to game' : 'Leave tournament'}
        </button>
        {complete && (
          <button type="button" className="control" onClick={tournament.reset}>
            New tournament
          </button>
        )}
      </div>
      {!run && (
        <section className="past-tournaments" aria-labelledby="past-title">
          <h3 id="past-title">Past tournaments</h3>
          {history.unavailable && <p>Progress won't be saved on this device.</p>}
          {history.items.length === 0 && <p>No past tournaments.</p>}
          <ul>
            {history.items.map((event, index) => {
              const champion = matchWinner(event, event.matches.length - 1);
              return (
                <li key={index}>
                  <span>
                    {event.players.length} players · Champion:{' '}
                    {champion == null ? '' : event.players[champion - 1]}
                  </span>
                  <button
                    type="button"
                    className="control"
                    onClick={() => tournament.viewPast(event)}
                  >
                    View tournament {index + 1}
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      )}
      <Exchange
        exportDocument={tournament.exportDocument}
        load={tournament.load}
        notice={tournament.notice}
      />
    </div>
  );
}
