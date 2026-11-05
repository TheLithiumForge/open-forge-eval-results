import { createTournament } from './tournament.ts';
import type { Tournament } from './tournament.ts';
import type { Dispatch, SetStateAction } from 'react';

interface Props {
  count: number;
  setCount: Dispatch<SetStateAction<number>>;
  names: string[];
  setNames: Dispatch<SetStateAction<string[]>>;
  setTournament: Dispatch<SetStateAction<Tournament | null>>;
  history: Tournament[];
  size: number;
  setNotice: Dispatch<SetStateAction<string>>;
  back(): void;
}
export function TournamentSetup({
  count,
  setCount,
  names,
  setNames,
  setTournament,
  history,
  size,
  setNotice,
  back,
}: Props) {
  return (
    <>
      <form
        className="tournament-setup"
        onSubmit={(event) => {
          event.preventDefault();
          const selected = names.slice(0, count).map((name) => name.trim());
          if (selected.some((name) => !name)) {
            setNotice('Enter a name for every player.');
            return;
          }
          setTournament(createTournament(selected, size));
          setNotice('');
        }}
      >
        <label htmlFor="player-count">Players</label>
        <select
          id="player-count"
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
              <label htmlFor={`player-${index + 1}`}>Player {index + 1}</label>
              <input
                id={`player-${index + 1}`}
                className="control"
                maxLength={80}
                required
                value={name}
                onChange={(event) => {
                  const value = event.currentTarget.value;
                  setNames(names.map((old, i) => (i === index ? value : old)));
                }}
              />
            </div>
          ))}
        </div>
        <div className="control-row">
          <button className="control" type="submit">
            Start tournament
          </button>
          <button className="control" type="button" onClick={back}>
            Back to game
          </button>
        </div>
      </form>
      <section className="tournament-section">
        <h2>Past tournaments</h2>
        {history.length === 0 ? (
          <p>No finished tournaments yet.</p>
        ) : (
          <ul>
            {history.map((past, index) => {
              const winner = past.rounds.at(-1)?.[0]?.winner;
              return (
                <li key={index}>
                  <button
                    type="button"
                    className="control"
                    onClick={() => {
                      setTournament(past);
                      setNotice('');
                    }}
                  >
                    Champion: {winner === null || winner === undefined ? '' : past.names[winner]}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </>
  );
}
