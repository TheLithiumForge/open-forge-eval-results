import { useState } from 'react';
import { nameError, normalizeName } from './names.ts';

interface SetupProps {
  start(names: readonly string[]): void;
  notice(text: string): void;
}

export function Setup({ start, notice }: SetupProps) {
  const [count, setCount] = useState(4);
  const [names, setNames] = useState<string[]>(Array.from({ length: 8 }, () => ''));
  const [error, setError] = useState('');
  return (
    <form
      className="tournament-setup"
      onSubmit={(event) => {
        event.preventDefault();
        const accepted = names.slice(0, count).map(normalizeName);
        const problem = nameError(accepted);
        setError(problem ?? '');
        if (problem) notice(problem);
        else start(accepted);
      }}
    >
      <p>
        Play a knockout tournament on this device. Fewer moves wins; ties use active time, then
        seed.
      </p>
      <div className="tournament-field">
        <label htmlFor="tournament-players">Players</label>
        <select
          id="tournament-players"
          className="control"
          value={count}
          onChange={(event) => setCount(Number(event.currentTarget.value))}
        >
          <option value="4">4</option>
          <option value="8">8</option>
        </select>
      </div>
      <div className="tournament-names">
        {names.slice(0, count).map((name, index) => (
          <label className="tournament-field" key={index} htmlFor={`player-${index + 1}`}>
            Player {index + 1}
            <input
              id={`player-${index + 1}`}
              className="control"
              value={name}
              autoComplete="off"
              aria-describedby={error ? 'tournament-name-error' : undefined}
              onChange={(event) => {
                const next = [...names];
                next[index] = event.currentTarget.value;
                setNames(next);
              }}
            />
          </label>
        ))}
      </div>
      {error && <p id="tournament-name-error">{error}</p>}
      <button className="control" type="submit">
        Start tournament
      </button>
    </form>
  );
}
