import { useState } from 'react';

interface SetupProps {
  names: readonly string[];
  edit(names: readonly string[]): void;
  start(): string | null;
}

export function Setup({ names, edit, start }: SetupProps) {
  const [error, setError] = useState<string | null>(null);
  return (
    <form
      className="tournament-setup"
      onSubmit={(event) => {
        event.preventDefault();
        setError(start());
      }}
    >
      <p>
        Play the same deal in each match. Fewer moves wins, then less active time, then the higher
        seed.
      </p>
      <div className="tournament-field">
        <label htmlFor="tournament-players">Players</label>
        <select
          id="tournament-players"
          className="control"
          value={names.length}
          onChange={(event) => {
            const count = Number(event.currentTarget.value);
            edit(Array.from({ length: count }, (_, index) => names[index] ?? ''));
          }}
        >
          <option value="4">4</option>
          <option value="8">8</option>
        </select>
      </div>
      <div className="tournament-names">
        {names.map((name, index) => (
          <label className="tournament-field" key={index}>
            Player {index + 1}
            <input
              className="control"
              value={name}
              autoComplete="off"
              aria-describedby={error ? 'tournament-name-error' : undefined}
              onChange={(event) =>
                edit(
                  names.map((value, position) =>
                    position === index ? event.currentTarget.value : value,
                  ),
                )
              }
            />
          </label>
        ))}
      </div>
      {error && <p id="tournament-name-error">{error}</p>}
      <button type="submit" className="control">
        Start tournament
      </button>
    </form>
  );
}
