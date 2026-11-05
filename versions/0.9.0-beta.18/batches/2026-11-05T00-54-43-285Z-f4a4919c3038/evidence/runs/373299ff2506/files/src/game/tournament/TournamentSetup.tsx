import type { TournamentSetupState } from './tournament-document.ts';

interface TournamentSetupProps {
  setup: TournamentSetupState;
  change(setup: TournamentSetupState): void;
  start(): void;
}

export function TournamentSetup({ setup, change, start }: TournamentSetupProps) {
  return (
    <form
      className="tournament-setup"
      onSubmit={(event) => {
        event.preventDefault();
        start();
      }}
    >
      <div className="size-control">
        <label htmlFor="tournament-players">Players</label>
        <select
          id="tournament-players"
          className="control"
          value={setup.playerCount}
          onChange={(event) => change({ ...setup, playerCount: Number(event.currentTarget.value) })}
        >
          <option value={4}>4</option>
          <option value={8}>8</option>
        </select>
      </div>
      <p className="help">
        Board: {setup.size}x{setup.size}
      </p>
      <div className="tournament-names">
        {setup.names.slice(0, setup.playerCount).map((name, index) => (
          <label key={index}>
            Player {index + 1}
            <input
              className="control"
              value={name}
              required
              pattern=".*\S.*"
              maxLength={60}
              autoComplete="off"
              onChange={(event) => {
                const names = [...setup.names];
                names[index] = event.currentTarget.value;
                change({ ...setup, names });
              }}
            />
          </label>
        ))}
      </div>
      <button type="submit" className="control">
        Start tournament
      </button>
    </form>
  );
}
