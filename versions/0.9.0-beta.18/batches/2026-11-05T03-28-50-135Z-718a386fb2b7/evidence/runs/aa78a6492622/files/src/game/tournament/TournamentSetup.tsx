import type { FormEvent } from 'react';
import type { PlayerCount } from './rules.ts';
import '../controls/control.css';

interface TournamentSetupProps {
  playerCount: PlayerCount;
  names: readonly string[];
  error: string;
  changeCount(count: PlayerCount): void;
  changeName(index: number, name: string): void;
  submit(event: FormEvent<HTMLFormElement>): void;
}

export function TournamentSetup({
  playerCount,
  names,
  error,
  changeCount,
  changeName,
  submit,
}: TournamentSetupProps) {
  return (
    <form className="tournament-setup" onSubmit={submit}>
      <div className="tournament-player-count">
        <label htmlFor="tournament-player-count">Players</label>
        <select
          id="tournament-player-count"
          className="control"
          value={playerCount}
          onChange={(event) => changeCount(event.currentTarget.value === '8' ? 8 : 4)}
        >
          <option value={4}>4</option>
          <option value={8}>8</option>
        </select>
      </div>
      <fieldset
        className="tournament-names"
        aria-describedby={error ? 'tournament-name-error' : undefined}
      >
        <legend>Enter player names</legend>
        {names.slice(0, playerCount).map((name, index) => (
          <div className="tournament-name-field" key={index}>
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
      </fieldset>
      {error && (
        <p id="tournament-name-error" className="tournament-error">
          {error}
        </p>
      )}
      <button className="control" type="submit">
        Start tournament
      </button>
    </form>
  );
}
