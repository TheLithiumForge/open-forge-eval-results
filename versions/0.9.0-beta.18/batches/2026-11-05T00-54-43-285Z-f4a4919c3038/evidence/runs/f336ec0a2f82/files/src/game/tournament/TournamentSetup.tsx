import { useState } from 'react';

interface TournamentSetupProps {
  size: number;
  start(players: readonly string[]): void;
}

export function TournamentSetup({ size, start }: TournamentSetupProps) {
  const [count, setCount] = useState(4);
  const [names, setNames] = useState(Array.from({ length: 8 }, () => ''));
  const [error, setError] = useState('');
  return (
    <form
      className="tournament-setup"
      onSubmit={(event) => {
        event.preventDefault();
        const players = names.slice(0, count).map((name) => name.trim());
        if (players.some((name) => !name)) {
          setError('Enter a name for every player.');
          return;
        }
        start(players);
      }}
    >
      <p>
        Knockout tournament · {size}x{size} cards
      </p>
      <p className="help">
        Both players play the same deal, one after the other. Fewer moves wins. Ties use the faster
        time; an exact tie goes to the first player. Time starts with the first reveal.
      </p>
      <div className="size-control">
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
          <label key={index} htmlFor={`tournament-player-${index}`}>
            Player {index + 1}
            <input
              id={`tournament-player-${index}`}
              className="control"
              value={name}
              required
              maxLength={80}
              autoComplete="off"
              onChange={(event) => {
                const value = event.currentTarget.value;
                setNames((previous) => previous.map((entry, i) => (i === index ? value : entry)));
                setError('');
              }}
            />
          </label>
        ))}
      </div>
      {error && <p role="alert">{error}</p>}
      <button className="control" type="submit">
        Start tournament
      </button>
    </form>
  );
}
