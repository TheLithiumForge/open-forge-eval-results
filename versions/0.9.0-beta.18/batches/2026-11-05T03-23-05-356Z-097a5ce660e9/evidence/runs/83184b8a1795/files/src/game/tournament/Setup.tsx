import { useState } from 'react';
import { namesError, normalizeName, winner } from './model.ts';
import type { TournamentState } from './model.ts';
interface Props {
  past: TournamentState[];
  unavailable: boolean;
  back(): void;
  start(names: string[]): void;
  view(tournament: TournamentState): void;
  error(message: string): void;
}
export function Setup({ past, unavailable, back, start, view, error }: Props) {
  const [count, setCount] = useState(4),
    [drafts, setDrafts] = useState(Array<string>(8).fill(''));
  function submit() {
    const names = drafts.slice(0, count).map(normalizeName),
      problem = namesError(names);
    if (problem) error(problem);
    else start(names);
  }
  return (
    <section className="tournament-section">
      <div className="tournament-fields">
        <label htmlFor="players">Players</label>
        <select
          className="control"
          id="players"
          value={count}
          onChange={(e) => setCount(Number(e.target.value))}
        >
          <option value={4}>4</option>
          <option value={8}>8</option>
        </select>
      </div>
      <div className="tournament-names">
        {drafts.slice(0, count).map((name, i) => (
          <label key={i}>
            Player {i + 1}
            <input
              className="control"
              value={name}
              onChange={(e) => setDrafts(drafts.map((v, j) => (i === j ? e.target.value : v)))}
            />
          </label>
        ))}
      </div>
      <button className="control" onClick={submit}>
        Start tournament
      </button>
      <h3>Past tournaments</h3>
      {unavailable && <p>Progress won't be saved on this device.</p>}
      {past.length === 0 ? (
        <p>No past tournaments.</p>
      ) : (
        <ul>
          {past.map((t, i) => {
            const last = t.matches.at(-1),
              won = last && winner(last);
            return (
              <li key={i}>
                <button className="control" onClick={() => view(t)}>
                  Champion: {won === null || won === undefined ? '' : t.names[won]}
                </button>
              </li>
            );
          })}
        </ul>
      )}
      <button className="control" onClick={back}>
        Back to game
      </button>
    </section>
  );
}
