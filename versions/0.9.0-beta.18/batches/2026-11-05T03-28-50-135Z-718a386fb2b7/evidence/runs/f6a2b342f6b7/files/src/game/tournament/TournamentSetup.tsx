import { useState } from 'react';
import { acceptNames } from './rules.ts';

interface TournamentSetupProps {
  start(names: readonly string[]): void;
  setNotice(message: string): void;
}

export function TournamentSetup({ start, setNotice }: TournamentSetupProps) {
  const [playerCount, setPlayerCount] = useState<4 | 8>(4);
  const [drafts, setDrafts] = useState<string[]>(Array.from({ length: 8 }, () => ''));

  function submit(): void {
    const accepted = acceptNames(drafts.slice(0, playerCount), playerCount);
    if (typeof accepted === 'string') {
      setNotice(accepted);
      return;
    }
    setNotice('');
    start(accepted);
  }

  return (
    <section className="tournament-setup" aria-labelledby="tournament-players-heading">
      <h3 id="tournament-players-heading">Players</h3>
      <div className="tournament-player-count">
        <label htmlFor="tournament-player-count">Players</label>
        <select
          id="tournament-player-count"
          className="control"
          value={playerCount}
          onChange={(event) => setPlayerCount(Number(event.currentTarget.value) === 8 ? 8 : 4)}
        >
          <option value={4}>4</option>
          <option value={8}>8</option>
        </select>
      </div>
      <div className="tournament-name-grid">
        {drafts.slice(0, playerCount).map((name, index) => (
          <div className="tournament-name-field" key={index}>
            <label htmlFor={`tournament-player-${index + 1}`}>Player {index + 1}</label>
            <input
              id={`tournament-player-${index + 1}`}
              className="control"
              type="text"
              value={name}
              autoComplete="off"
              onChange={(event) => {
                const next = [...drafts];
                next[index] = event.currentTarget.value;
                setDrafts(next);
              }}
            />
          </div>
        ))}
      </div>
      <button type="button" className="control" onClick={submit}>
        Start tournament
      </button>
    </section>
  );
}
