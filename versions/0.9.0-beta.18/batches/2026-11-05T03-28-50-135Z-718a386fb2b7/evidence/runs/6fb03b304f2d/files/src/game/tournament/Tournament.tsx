import { useEffect, useRef } from 'react';
import { useTournament } from './use-tournament.ts';
import { MatchView } from './MatchView.tsx';
import { TournamentTools } from './TournamentTools.tsx';
import './tournament.css';

export function Tournament({ back }: { back(): void }) {
  const state = useTournament();
  const { tournament, count, setCount, names, setNames, start, notice, controller } = state;
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    heading.current?.focus();
  }, [tournament?.phase, tournament?.current]);
  const match = tournament?.matches[tournament.current];
  const player = match && tournament ? match.players[match.scores[0] === null ? 0 : 1] : null;
  let status = notice;
  if (!status && tournament && match) {
    if (tournament.phase === 'complete') status = `Champion: ${tournament.names[match.winner!]}`;
    else if (tournament.phase === 'matchComplete')
      status = `Winner: ${tournament.names[match.winner!]}`;
    else if (tournament.phase === 'playing') status = controller.session.feedback;
    else if (player !== null && player !== undefined)
      status = `Now playing: ${tournament.names[player]}`;
  }
  return (
    <>
      <h2 ref={heading} tabIndex={-1}>
        Tournament
      </h2>
      <div className="game-result">
        <p role="status" aria-live="polite" aria-atomic="true">
          <span key={controller.session.announcement}>{status}</span>
        </p>
      </div>
      {!tournament ? (
        <section className="tournament-section">
          <label htmlFor="players">Players</label>{' '}
          <select
            id="players"
            className="control"
            value={count}
            onChange={(e) => setCount(Number(e.currentTarget.value))}
          >
            <option value={4}>4</option>
            <option value={8}>8</option>
          </select>
          <div className="player-fields">
            {names.slice(0, count).map((name, i) => (
              <label key={i}>
                Player {i + 1}
                <input
                  className="control"
                  value={name}
                  onChange={(e) => {
                    const value = e.currentTarget.value;
                    setNames(names.map((n, j) => (j === i ? value : n)));
                  }}
                />
              </label>
            ))}
          </div>
          <button className="control" type="button" onClick={start}>
            Start tournament
          </button>{' '}
          <button className="control" type="button" onClick={back}>
            Back to game
          </button>
        </section>
      ) : (
        <MatchView state={state} back={back} />
      )}
      <TournamentTools state={state} />
    </>
  );
}
