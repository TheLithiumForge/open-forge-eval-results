import type { FormEvent } from 'react';

interface TournamentEntryProps {
  readonly playerCount: number;
  readonly names: readonly string[];
  readonly notice: string;
  onPlayerCountChange(count: number): void;
  onNameChange(index: number, value: string): void;
  onStart(): void;
}

export function TournamentEntry({
  playerCount,
  names,
  notice,
  onPlayerCountChange,
  onNameChange,
  onStart,
}: TournamentEntryProps) {
  function submit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    onStart();
  }

  return (
    <form className="tournament-entry" onSubmit={submit}>
      <div className="tournament-player-count">
        <label htmlFor="tournament-player-count">Players</label>
        <select
          id="tournament-player-count"
          className="control"
          value={playerCount}
          onChange={(event) => onPlayerCountChange(Number(event.currentTarget.value))}
        >
          <option value={4}>4</option>
          <option value={8}>8</option>
        </select>
      </div>
      <div className="tournament-name-fields">
        {names.slice(0, playerCount).map((name, index) => (
          <div className="tournament-name-field" key={index}>
            <label htmlFor={`tournament-player-${index + 1}`}>Player {index + 1}</label>
            <input
              id={`tournament-player-${index + 1}`}
              className="control"
              type="text"
              value={name}
              onChange={(event) => onNameChange(index, event.currentTarget.value)}
              autoComplete="off"
            />
          </div>
        ))}
      </div>
      <button type="submit" className="control" aria-describedby="tournament-entry-notice">
        Start tournament
      </button>
      <p id="tournament-entry-notice" className="tournament-notice">
        {notice}
      </p>
    </form>
  );
}
