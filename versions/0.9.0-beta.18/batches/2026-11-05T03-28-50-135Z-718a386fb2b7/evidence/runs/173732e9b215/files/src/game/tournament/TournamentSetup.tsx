import { currentMatch } from './tournament.ts';
import type { Dispatch, SetStateAction } from 'react';
import type { TournamentData } from './tournament.ts';

interface Props {
  count: number;
  setCount(value: number): void;
  names: string[];
  setNames: Dispatch<SetStateAction<string[]>>;
  size: number;
  start(): void;
  back(): void;
  history: TournamentData[];
  open(item: TournamentData): void;
}
export function TournamentSetup({
  count,
  setCount,
  names,
  setNames,
  size,
  start,
  back,
  history,
  open,
}: Props) {
  return (
    <>
      <p>
        Share one device and play the same deal in each match. Fewer moves wins; time breaks a tie.
        If both are equal, replay the match.
      </p>
      <div className="tournament-setup">
        <label htmlFor="players">Players</label>
        <select
          id="players"
          className="control"
          value={count}
          onChange={(event) => setCount(Number(event.currentTarget.value))}
        >
          <option value={4}>4</option>
          <option value={8}>8</option>
        </select>
        <div className="player-inputs">
          {names.slice(0, count).map((name, index) => (
            <div key={index}>
              <label htmlFor={`player-${index}`}>Player {index + 1}</label>
              <input
                id={`player-${index}`}
                className="control"
                value={name}
                maxLength={100}
                onChange={(event) => {
                  const value = event.currentTarget.value;
                  setNames((old) => old.map((item, i) => (i === index ? value : item)));
                }}
              />
            </div>
          ))}
        </div>
        <p>
          Board size: {size}x{size}
        </p>
        <div className="tournament-actions">
          <button className="control" onClick={start}>
            Start tournament
          </button>
          <button className="control" onClick={back}>
            Back to game
          </button>
        </div>
      </div>
      <section>
        <h2>Past tournaments</h2>
        {history.length === 0 ? (
          <p>No finished tournaments yet.</p>
        ) : (
          <ul>
            {history.map((item, index) => (
              <li key={index}>
                <button className="control" onClick={() => open(item)}>
                  Champion: {item.names[currentMatch(item).winner ?? 0]}
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
