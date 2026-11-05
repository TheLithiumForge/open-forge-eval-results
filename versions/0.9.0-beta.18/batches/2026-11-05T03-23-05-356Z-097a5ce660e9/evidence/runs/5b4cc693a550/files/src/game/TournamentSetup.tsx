import type { Dispatch, SetStateAction } from 'react';
import type { TournamentState } from './tournament.ts';
interface Props {
  count: number;
  setCount: Dispatch<SetStateAction<number>>;
  names: string[];
  setNames: Dispatch<SetStateAction<string[]>>;
  start(): void;
  back(): void;
  open(item: TournamentState): void;
  history: { items: TournamentState[]; unavailable: boolean };
  notice: string;
}
export function TournamentSetup({
  count,
  setCount,
  names,
  setNames,
  start,
  back,
  open,
  history,
  notice,
}: Props) {
  return (
    <>
      <div className="tournament-form">
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
        {names.slice(0, count).map((name, index) => (
          <div className="name-field" key={index}>
            <label htmlFor={`player-${index}`}>Player {index + 1}</label>
            <input
              className="control"
              id={`player-${index}`}
              value={name}
              onChange={(e) =>
                setNames((old) => old.map((n, i) => (i === index ? e.target.value : n)))
              }
            />
          </div>
        ))}
        <p id="name-notice">
          {notice === 'Use 2 to 20 characters.' || notice === 'Each name must be different.'
            ? notice
            : ''}
        </p>
        <button className="control" type="button" onClick={start} aria-describedby="name-notice">
          Start tournament
        </button>
      </div>
      <h3>Past tournaments</h3>
      {history.unavailable && <p>Progress won't be saved on this device.</p>}
      {history.items.length === 0 ? (
        <p>No past tournaments.</p>
      ) : (
        <ul>
          {history.items.map((item, index) => (
            <li key={index}>
              <button type="button" className="control" onClick={() => open(item)}>
                Champion: {item.names[item.matches.at(-1)!.winner!]}
              </button>
            </li>
          ))}
        </ul>
      )}
      <button type="button" className="control" onClick={back}>
        Back to game
      </button>
    </>
  );
}
