import type { TournamentSetup } from './format.ts';

interface SetupProps {
  setup: TournamentSetup;
  update(count: number, names: readonly string[]): void;
  start(): void;
}

export function Setup({ setup, update, start }: SetupProps) {
  return (
    <form
      className="tournament-setup"
      onSubmit={(event) => {
        event.preventDefault();
        start();
      }}
    >
      <div className="tournament-field">
        <label htmlFor="tournament-players">Players</label>
        <select
          id="tournament-players"
          className="control"
          value={setup.count}
          onChange={(event) => update(Number(event.currentTarget.value), setup.names)}
        >
          <option value={4}>4</option>
          <option value={8}>8</option>
        </select>
      </div>
      <div className="tournament-names">
        {setup.names.slice(0, setup.count).map((name, index) => (
          <label className="tournament-field" key={index} htmlFor={`tournament-player-${index}`}>
            Player {index + 1}
            <input
              id={`tournament-player-${index}`}
              className="control"
              value={name}
              autoComplete="off"
              onChange={(event) =>
                update(
                  setup.count,
                  setup.names.map((value, position) =>
                    position === index ? event.currentTarget.value : value,
                  ),
                )
              }
            />
          </label>
        ))}
      </div>
      <p className="help">Use 2 to 20 characters per name. Each name must be different.</p>
      <button type="submit" className="control">
        Start tournament
      </button>
    </form>
  );
}
