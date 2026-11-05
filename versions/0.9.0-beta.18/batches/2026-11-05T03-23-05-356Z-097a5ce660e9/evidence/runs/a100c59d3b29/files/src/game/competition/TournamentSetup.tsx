import type { TournamentPlayerCount } from './types.ts';

interface TournamentSetupProps {
  readonly playerCount: TournamentPlayerCount;
  readonly names: readonly string[];
  onPlayerCountChange(value: TournamentPlayerCount): void;
  onNameChange(index: number, value: string): void;
  onStart(): void;
  onBack(): void;
}

export function TournamentSetup({
  playerCount,
  names,
  onPlayerCountChange,
  onNameChange,
  onStart,
  onBack,
}: TournamentSetupProps) {
  return (
    <section aria-labelledby="tournament-setup-heading" className="tournament-setup">
      <h3 id="tournament-setup-heading">Set up a tournament</h3>
      <form
        className="tournament-form"
        onSubmit={(event) => {
          event.preventDefault();
          onStart();
        }}
      >
        <div className="tournament-player-count">
          <label htmlFor="tournament-player-count">Players</label>
          <select
            id="tournament-player-count"
            className="control"
            value={playerCount}
            onChange={(event) => {
              const value = Number(event.currentTarget.value);
              if (value === 4 || value === 8) onPlayerCountChange(value);
            }}
          >
            <option value={4}>4</option>
            <option value={8}>8</option>
          </select>
        </div>
        <div className="tournament-player-fields">
          {Array.from({ length: playerCount }, (_, index) => (
            <div className="tournament-player-field" key={index}>
              <label htmlFor={`tournament-player-${index + 1}`}>Player {index + 1}</label>
              <input
                id={`tournament-player-${index + 1}`}
                className="control"
                type="text"
                maxLength={256}
                autoComplete="off"
                value={names[index] ?? ''}
                onChange={(event) => onNameChange(index, event.currentTarget.value)}
              />
            </div>
          ))}
        </div>
        <div className="tournament-actions">
          <button type="submit" className="control">
            Start tournament
          </button>
          <button type="button" className="control" onClick={onBack}>
            Back to game
          </button>
        </div>
      </form>
    </section>
  );
}
