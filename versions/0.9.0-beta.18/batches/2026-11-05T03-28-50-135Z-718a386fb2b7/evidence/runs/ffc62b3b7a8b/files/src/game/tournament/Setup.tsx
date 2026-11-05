import { useState } from 'react';
import { Bracket } from './Bracket.tsx';
import { nameError, normalizeName, winner } from './tournament.ts';
import type { TournamentState } from './tournament.ts';

export function Setup({
  history,
  blocked,
  back,
  start,
  announce,
}: {
  history: TournamentState[];
  blocked: boolean;
  back(): void;
  start(names: string[]): void;
  announce(message: string): void;
}) {
  const [count, setCount] = useState(4);
  const [drafts, setDrafts] = useState(Array<string>(8).fill(''));
  const [error, setError] = useState('');
  function submit() {
    const names = drafts.slice(0, count).map(normalizeName);
    const message = nameError(names);
    if (message) {
      setError(message);
      announce(message);
      return;
    }
    setError('');
    start(names);
  }
  return (
    <>
      <div className="tournament-section">
        <label htmlFor="players">Players</label>{' '}
        <select
          className="control"
          id="players"
          value={count}
          onChange={(e) => setCount(Number(e.currentTarget.value))}
        >
          <option value={4}>4</option>
          <option value={8}>8</option>
        </select>
        <div className="tournament-fields">
          {drafts.slice(0, count).map((name, index) => (
            <label key={index}>
              Player {index + 1}
              <input
                className="control"
                value={name}
                onChange={(e) => {
                  const value = e.currentTarget.value;
                  setDrafts((old) => old.map((item, i) => (i === index ? value : item)));
                }}
              />
            </label>
          ))}
        </div>
        {error && <p>{error}</p>}
        <button type="button" className="control" onClick={submit}>
          Start tournament
        </button>
      </div>
      <section className="tournament-section">
        <h3>Past tournaments</h3>
        {blocked && <p>Progress won't be saved on this device.</p>}
        {history.length === 0 ? (
          <p>No past tournaments.</p>
        ) : (
          history.map((item, index) => (
            <details key={index}>
              <summary>
                Champion: {item.names[winner(item.matches[item.matches.length - 1]!)]}
              </summary>
              <Bracket tournament={item} />
            </details>
          ))
        )}
      </section>
      <button type="button" className="control" onClick={back}>
        Back to game
      </button>
    </>
  );
}
