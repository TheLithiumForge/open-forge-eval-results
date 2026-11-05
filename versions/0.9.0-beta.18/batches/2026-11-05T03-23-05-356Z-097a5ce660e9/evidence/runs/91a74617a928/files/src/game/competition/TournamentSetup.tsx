import { currentMatch } from './tournament.ts';
import type { Tournament } from './tournament.ts';

interface Props {
  count: number;
  setCount(value: number): void;
  names: string[];
  setNames(value: string[]): void;
  start(): void;
  back(): void;
  history: Tournament[];
  select(tournament: Tournament): void;
}
export function Setup({ count, setCount, names, setNames, start, back, history, select }: Props) {
  return (
    <>
      <div className="tournament-form">
        <label htmlFor="players">Players</label>
        <select
          className="control"
          id="players"
          value={count}
          onChange={(e) => setCount(Number(e.currentTarget.value))}
        >
          <option value={4}>4</option>
          <option value={8}>8</option>
        </select>
        {names.slice(0, count).map((name, i) => (
          <div className="name-field" key={i}>
            <label htmlFor={`player-${i}`}>Player {i + 1}</label>
            <input
              className="control"
              id={`player-${i}`}
              value={name}
              onChange={(e) => {
                const values = [...names];
                values[i] = e.currentTarget.value;
                setNames(values);
              }}
            />
          </div>
        ))}
        <button className="control" type="button" onClick={start}>
          Start tournament
        </button>
        <button className="control" type="button" onClick={back}>
          Back to game
        </button>
      </div>
      <h3>Past tournaments</h3>
      {history.length === 0 ? (
        <p>None yet.</p>
      ) : (
        <ul>
          {history.map((past, i) => (
            <li key={i}>
              <button className="control" type="button" onClick={() => select(past)}>
                Champion: {past.names[currentMatch(past).winner!]}
              </button>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
