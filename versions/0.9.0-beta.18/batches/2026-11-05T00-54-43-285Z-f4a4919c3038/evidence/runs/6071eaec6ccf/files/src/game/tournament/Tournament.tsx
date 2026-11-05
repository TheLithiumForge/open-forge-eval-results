import { formatElapsed } from '../elapsed-time.ts';
import { matchWinner, TournamentPhase } from './rules.ts';
import { STORAGE_NOTICE } from './storage.ts';
import { Bracket } from './Bracket.tsx';
import { Exchange } from './Exchange.tsx';
import { Setup } from './Setup.tsx';
import { LeaveDialog } from './LeaveDialog.tsx';
import { TournamentTurn } from './TournamentTurn.tsx';
import { useTournament } from './use-tournament.ts';
import type { ReactNode } from 'react';
import type { TournamentState } from './rules.ts';
import type { TournamentHistory } from './storage.ts';
import './tournament.css';

interface TournamentProps {
  back(): void;
  announce(message: string): void;
  status: ReactNode;
  history: TournamentHistory;
  remember(state: TournamentState): void;
}

export function Tournament({ back, announce, status, history, remember }: TournamentProps) {
  const {
    state,
    setState,
    problem,
    notice,
    leave,
    setLeave,
    loadedTurn,
    celebration,
    generation,
    heading,
    turn,
    match,
    complete,
    setup,
    winner,
    name,
    round,
    adopt,
    confirm,
    start,
    played,
    load,
    begin,
    proceed,
    exportTournament,
  } = useTournament(announce, remember);

  return (
    <section className="tournament">
      <h2 ref={heading} tabIndex={-1}>
        {complete ? 'Tournament complete' : setup ? 'Tournament' : 'Tournament match'}
      </h2>
      {setup ? (
        <Setup state={state} change={setState} start={start} problem={problem} />
      ) : (
        <>
          {complete ? (
            <p className={`victory${celebration ? ' celebrate' : ''}`}>
              Champion: {winner === null ? '' : state.names[winner]}
            </p>
          ) : (
            <>
              <p>Round: {round.name}</p>
              <p>Now playing: {name}</p>
              {state.phase === TournamentPhase.ready || loadedTurn ? (
                <button type="button" className="control" onClick={begin}>
                  Start turn
                </button>
              ) : null}
              {state.phase === TournamentPhase.result && (
                <>
                  <p className={`victory${celebration ? ' celebrate' : ''}`}>
                    {name} finished in {match?.results.at(-1)?.moves} moves and{' '}
                    {formatElapsed(match?.results.at(-1)?.elapsedMs ?? 0)}.
                  </p>
                  {match?.results.length === 2 && (
                    <p>Winner: {state.names[matchWinner(state, state.matchIndex) ?? 0]}</p>
                  )}
                  <button type="button" className="control" onClick={proceed}>
                    {match?.results.length === 2 ? 'Next match' : 'Next turn'}
                  </button>
                </>
              )}
            </>
          )}
        </>
      )}
      {status}
      {state.game && !loadedTurn && (
        <TournamentTurn
          key={generation + ':' + state.matchIndex + ':' + match?.results.length}
          ref={turn}
          game={state.game}
          completed={played}
          announce={announce}
        />
      )}
      {!setup && <Bracket state={state} />}
      <div className="tournament-actions">
        <button type="button" className="control" onClick={() => confirm(back)}>
          {setup || complete ? 'Back to game' : 'Leave tournament'}
        </button>
      </div>
      <Exchange notice={notice} loadTournament={load} exportTournament={exportTournament} />
      {setup && (
        <section className="past-tournaments">
          <h3>Past tournaments</h3>
          {history.blocked && <p>{STORAGE_NOTICE}</p>}
          {history.items.length === 0 ? (
            <p>No finished tournaments yet.</p>
          ) : (
            <ul>
              {history.items.map((item, index) => (
                <li key={index}>
                  <button type="button" className="control" onClick={() => adopt(item)}>
                    {item.names.length} players · Champion:{' '}
                    {item.names[matchWinner(item, item.matches.length - 1) ?? 0]}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
      <LeaveDialog leave={leave} close={() => setLeave(null)} />
    </section>
  );
}
