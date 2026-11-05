import type { FormEvent } from 'react';
import './tournament.css';

interface TournamentSetupProps {
  count: 4 | 8;
  names: readonly string[];
  changeCount(count: 4 | 8): void;
  changeName(index: number, name: string): void;
  start(): void;
  back(): void;
  message: string;
}

export function TournamentSetup({
  count,
  names,
  changeCount,
  changeName,
  start,
  back,
  message,
}: TournamentSetupProps) {
  function submit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    start();
  }
  return (
    <section className="tournament-setup" aria-labelledby="tournament-setup-title">
      <h3 id="tournament-setup-title">Set up tournament</h3>
      <form onSubmit={submit}>
        <div className="tournament-field">
          <label htmlFor="tournament-players">Players</label>
          <select
            id="tournament-players"
            className="control"
            value={count}
            onChange={(event) => changeCount(Number(event.currentTarget.value) === 8 ? 8 : 4)}
          >
            <option value="4">4</option>
            <option value="8">8</option>
          </select>
        </div>
        <div className="tournament-names">
          {names.slice(0, count).map((name, index) => (
            <div className="tournament-field" key={index}>
              <label htmlFor={`tournament-player-${index + 1}`}>Player {index + 1}</label>
              <input
                id={`tournament-player-${index + 1}`}
                className="control"
                type="text"
                autoComplete="off"
                value={name}
                onChange={(event) => changeName(index, event.currentTarget.value)}
              />
            </div>
          ))}
        </div>
        <div className="tournament-actions">
          <button type="submit" className="control" aria-describedby="tournament-name-notice">
            Start tournament
          </button>
          <button type="button" className="control" onClick={back}>
            Back to game
          </button>
        </div>
        <p id="tournament-name-notice" className="tournament-message">
          {message}
        </p>
      </form>
    </section>
  );
}
