import { useRef } from 'react';
import { Board } from '../board/Board.tsx';
import type { BoardFocus } from '../board/Board.tsx';
import { GameStatus } from '../status/GameStatus.tsx';
import { Bracket } from './Bracket.tsx';
import { Exchange } from './Exchange.tsx';
import { Setup } from './Setup.tsx';
import { TournamentPhase } from './rules.ts';
import type { useTournament } from '../session/use-tournament.ts';
import type { useTournamentHistory } from '../session/use-tournament-history.ts';
import type { TournamentArchive } from './format.ts';
import './tournament.css';

interface TournamentProps {
  controller: ReturnType<typeof useTournament>;
  history: ReturnType<typeof useTournamentHistory>;
  back(): void;
  confirm(action: () => void, needed: boolean): void;
}

export function Tournament({ controller, history, back, confirm }: TournamentProps) {
  const board = useRef<BoardFocus>(null);
  const { session } = controller;
  const { tournament } = session;
  const match = tournament?.matches[tournament.matchIndex];
  const unfinished = tournament !== null && tournament.phase !== TournamentPhase.complete;
  function load(archive: TournamentArchive): void {
    confirm(() => controller.restore(archive), unfinished);
  }
  return (
    <section className="tournament">
      {!tournament && <Setup start={controller.start} notice={controller.notice} />}
      {tournament && match && (
        <>
          {tournament.phase === TournamentPhase.complete ? (
            <p className={`victory${session.celebration ? ' celebrate' : ''}`}>
              Champion: {tournament.players[match.winner ?? -1]}
            </p>
          ) : (
            <>
              <p>Round: {match.round}</p>
              <p>
                Match {tournament.matchIndex + 1}:{' '}
                {match.players
                  .map((player) => (player === null ? 'Pending' : tournament.players[player]))
                  .join(' vs ')}
              </p>
              <p>Now playing: {tournament.players[match.players[tournament.turn] ?? -1]}</p>
            </>
          )}
          <div className="tournament-actions">
            {tournament.phase === TournamentPhase.ready && (
              <button type="button" className="control" onClick={controller.startTurn}>
                Start turn
              </button>
            )}
            {tournament.phase === TournamentPhase.turnComplete && (
              <button type="button" className="control" onClick={controller.nextTurn}>
                Next turn
              </button>
            )}
            {tournament.phase === TournamentPhase.matchComplete && (
              <button type="button" className="control" onClick={controller.nextTurn}>
                Next match
              </button>
            )}
            {unfinished && (
              <button
                type="button"
                className="control"
                onClick={() =>
                  confirm(() => {
                    controller.clear();
                    back();
                  }, true)
                }
              >
                Leave tournament
              </button>
            )}
          </div>
          {tournament.phase !== TournamentPhase.ready &&
            tournament.phase !== TournamentPhase.complete && (
              <GameStatus game={session.game} best={undefined} celebration={session.celebration} />
            )}
          {tournament.phase === TournamentPhase.playing && (
            <>
              <p id="board-help" className="help">
                Arrow keys move between cards. Enter or Space reveals a card.
              </p>
              <Board
                key={session.generation}
                game={session.game}
                activate={controller.activate}
                ref={board}
              />
            </>
          )}
          <Bracket tournament={tournament} />
        </>
      )}
      {!unfinished && (
        <button
          type="button"
          className="control"
          onClick={() => {
            controller.clear();
            back();
          }}
        >
          Back to game
        </button>
      )}
      <Exchange
        exportTournament={controller.exportTournament}
        load={load}
        notice={controller.notice}
        loadNotice={session.loadNotice}
      />
      <section className="tournament-history" aria-labelledby="past-tournaments">
        <h3 id="past-tournaments">Past tournaments</h3>
        {!history.available && <p>Progress won't be saved on this device.</p>}
        {history.items.length === 0 && <p>No past tournaments.</p>}
        <ul>
          {history.items.map((archive, index) => {
            const saved = archive.tournament;
            if (!saved) return null;
            return (
              <li key={index}>
                <button
                  type="button"
                  className="control"
                  onClick={() => confirm(() => controller.restore(archive, false), unfinished)}
                >
                  {saved.players.length} players · Champion:{' '}
                  {saved.players[saved.matches.at(-1)?.winner ?? -1]}
                </button>
              </li>
            );
          })}
        </ul>
      </section>
    </section>
  );
}
