import type { FormEvent } from 'react';
import { acceptedNames, normalizePlayerName } from './model.ts';
import './tournament.css';

interface SetupProps {
  count: number;
  names: readonly string[];
  onCount(count: number): void;
  onName(index: number, name: string): void;
  notice: string;
  onNotice(message: string): void;
  onStart(names: readonly string[]): void;
  backToGame(): void;
}

export function TournamentSetup({
  count,
  names,
  notice,
  onCount,
  onName,
  onNotice,
  onStart,
  backToGame,
}: SetupProps) {
  function submit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    const chosen = names.slice(0, count).map(normalizePlayerName);
    if (chosen.some((name) => Array.from(name).length < 2 || Array.from(name).length > 20)) {
      onNotice('Use 2 to 20 characters.');
      return;
    }
    if (new Set(chosen.map((name) => name.toLowerCase())).size !== count) {
      onNotice('Each name must be different.');
      return;
    }
    const accepted = acceptedNames(names, count);
    if (!accepted) return;
    onNotice('');
    onStart(accepted);
  }
  return (
    <section className="tournament-setup" aria-labelledby="tournament-setup-heading">
      <h3 id="tournament-setup-heading">Set up tournament</h3>
      <form onSubmit={submit}>
        <div className="tournament-count">
          <label htmlFor="tournament-player-count">Players</label>
          <select
            id="tournament-player-count"
            className="control"
            value={count}
            onChange={(event) => onCount(Number(event.currentTarget.value))}
          >
            <option value={4}>4</option>
            <option value={8}>8</option>
          </select>
        </div>
        <div className="tournament-players">
          {Array.from({ length: 8 }, (_, index) => (
            <div className="tournament-player-field" key={index}>
              <label htmlFor={`tournament-player-${index + 1}`}>Player {index + 1}</label>
              <input
                id={`tournament-player-${index + 1}`}
                className="control"
                type="text"
                autoComplete="off"
                aria-describedby={notice ? 'tournament-status' : undefined}
                value={names[index] ?? ''}
                disabled={index >= count}
                onChange={(event) => onName(index, event.currentTarget.value)}
              />
            </div>
          ))}
        </div>
        <div className="tournament-actions">
          <button type="submit" className="control">
            Start tournament
          </button>
          <button type="button" className="control" onClick={backToGame}>
            Back to game
          </button>
        </div>
      </form>
    </section>
  );
}
