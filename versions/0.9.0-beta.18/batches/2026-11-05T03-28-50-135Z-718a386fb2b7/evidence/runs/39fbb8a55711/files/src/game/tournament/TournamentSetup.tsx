import { useState } from 'react';
import type { FormEvent } from 'react';

interface TournamentSetupProps {
  error: string;
  onBack(): void;
  start(names: readonly string[], count: 4 | 8): void;
}

export function TournamentSetup({ error, onBack, start }: TournamentSetupProps) {
  const [count, setCount] = useState<4 | 8>(4);
  const [drafts, setDrafts] = useState<string[]>(Array.from({ length: 8 }, () => ''));

  function submit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    start(drafts.slice(0, count), count);
  }

  return (
    <section className="tournament-setup" aria-labelledby="tournament-setup-title">
      <h3 id="tournament-setup-title">Start a tournament</h3>
      <form className="tournament-form" onSubmit={submit}>
        <div className="tournament-player-count">
          <label htmlFor="tournament-player-count">Players</label>
          <select
            id="tournament-player-count"
            className="control"
            value={count}
            onChange={(event) => setCount(Number(event.currentTarget.value) as 4 | 8)}
          >
            <option value={4}>4 players</option>
            <option value={8}>8 players</option>
          </select>
        </div>
        <div className="tournament-player-fields">
          {drafts.slice(0, count).map((name, index) => {
            const id = `tournament-player-${index + 1}`;
            return (
              <div className="tournament-player-field" key={index}>
                <label htmlFor={id}>Player {index + 1}</label>
                <input
                  id={id}
                  className="control"
                  type="text"
                  autoComplete="off"
                  value={name}
                  aria-describedby={error ? 'tournament-form-error' : undefined}
                  onChange={(event) => {
                    const next = [...drafts];
                    next[index] = event.currentTarget.value;
                    setDrafts(next);
                  }}
                />
              </div>
            );
          })}
        </div>
        {error && (
          <p className="tournament-form-error" id="tournament-form-error">
            {error}
          </p>
        )}
        <div className="tournament-actions">
          <button className="control" type="submit">
            Start tournament
          </button>
          <button className="control" type="button" onClick={onBack}>
            Back to game
          </button>
        </div>
      </form>
    </section>
  );
}
