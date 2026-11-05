import { useState } from 'react';
import type { FormEvent } from 'react';
import { checkPlayerNames } from './names.ts';

interface TournamentSetupProps {
  start(names: readonly string[], count: 4 | 8): void;
  leave(): void;
  report(message: string): void;
}

export function TournamentSetup({ start, leave, report }: TournamentSetupProps) {
  const [count, setCount] = useState<4 | 8>(4);
  const [drafts, setDrafts] = useState(() => Array.from({ length: 8 }, () => ''));
  const [error, setError] = useState('');

  function submit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    const checked = checkPlayerNames(drafts, count);
    if (!checked.accepted) {
      setError(checked.message);
      report(checked.message);
      return;
    }
    setError('');
    start(checked.names, count);
  }

  return (
    <section className="tournament-setup" aria-labelledby="tournament-setup-title">
      <h3 id="tournament-setup-title">Set up a tournament</h3>
      <form onSubmit={submit}>
        <div className="tournament-count">
          <label htmlFor="tournament-player-count">Players</label>
          <select
            id="tournament-player-count"
            className="control"
            value={count}
            onChange={(event) => setCount(event.currentTarget.value === '8' ? 8 : 4)}
          >
            <option value={4}>4</option>
            <option value={8}>8</option>
          </select>
        </div>
        <div className="tournament-name-grid">
          {drafts.slice(0, count).map((name, index) => {
            const id = `tournament-player-${index + 1}`;
            return (
              <div className="tournament-name-field" key={id}>
                <label htmlFor={id}>Player {index + 1}</label>
                <input
                  id={id}
                  className="control"
                  type="text"
                  autoComplete="off"
                  value={name}
                  aria-describedby="tournament-name-error"
                  onChange={(event) => {
                    const value = event.currentTarget.value;
                    setDrafts((current) =>
                      current.map((draft, draftIndex) => (draftIndex === index ? value : draft)),
                    );
                  }}
                />
              </div>
            );
          })}
        </div>
        <p id="tournament-name-error" className="tournament-error">
          {error}
        </p>
        <div className="tournament-actions">
          <button type="submit" className="control">
            Start tournament
          </button>
          <button type="button" className="control" onClick={leave}>
            Leave tournament
          </button>
        </div>
      </form>
    </section>
  );
}
