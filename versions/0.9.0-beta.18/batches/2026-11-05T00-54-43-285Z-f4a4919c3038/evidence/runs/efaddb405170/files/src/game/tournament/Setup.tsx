import { useState } from 'react';
import { validateNames } from './rules.ts';

interface SetupProps {
  start(names: readonly string[]): void;
  publish(text: string): void;
}

export function Setup({ start, publish }: SetupProps) {
  const [count, setCount] = useState(4);
  const [names, setNames] = useState(() => Array.from({ length: 8 }, () => ''));
  const [error, setError] = useState('');
  return (
    <form
      className="tournament-setup"
      onSubmit={(event) => {
        event.preventDefault();
        const result = validateNames(names.slice(0, count));
        if (result.error) {
          setError(result.error);
          publish(result.error);
        } else if (result.names) start(result.names);
      }}
    >
      <div className="tournament-field">
        <label htmlFor="tournament-players">Players</label>
        <select
          id="tournament-players"
          className="control"
          value={count}
          onChange={(event) => setCount(Number(event.currentTarget.value))}
        >
          <option value={4}>4</option>
          <option value={8}>8</option>
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
              aria-describedby="name-error"
              onChange={(event) => {
                const value = event.currentTarget.value;
                setNames((previous) =>
                  previous.map((entry, position) => (position === index ? value : entry)),
                );
              }}
            />
          </label>
        ))}
      </div>
      <p id="name-error">{error}</p>
      <button className="control" type="submit">
        Start tournament
      </button>
    </form>
  );
}
