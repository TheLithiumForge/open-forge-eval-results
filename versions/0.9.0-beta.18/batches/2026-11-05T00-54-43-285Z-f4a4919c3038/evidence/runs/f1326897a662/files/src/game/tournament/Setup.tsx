import type { TournamentSetup } from './format.ts';

interface SetupProps {
  setup: TournamentSetup;
  errors: readonly string[];
  change(setup: TournamentSetup): void;
  start(): void;
}

export function Setup({ setup, errors, change, start }: SetupProps) {
  return (
    <form
      className="tournament-form"
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
          onChange={(event) =>
            change({ ...setup, count: event.currentTarget.value === '8' ? 8 : 4 })
          }
        >
          <option value="4">4</option>
          <option value="8">8</option>
        </select>
      </div>
      <div className="tournament-names">
        {setup.names.slice(0, setup.count).map((name, index) => (
          <div className="tournament-field" key={index}>
            <label htmlFor={`tournament-player-${index}`}>Player {index + 1}</label>
            <input
              id={`tournament-player-${index}`}
              className="control"
              value={name}
              autoComplete="off"
              aria-invalid={Boolean(errors[index])}
              aria-describedby={errors[index] ? `player-error-${index}` : undefined}
              onChange={(event) =>
                change({
                  ...setup,
                  names: setup.names.map((value, other) =>
                    other === index ? event.currentTarget.value : value,
                  ),
                })
              }
            />
            {errors[index] && <p id={`player-error-${index}`}>{errors[index]}</p>}
          </div>
        ))}
      </div>
      <button className="control" type="submit">
        Start tournament
      </button>
    </form>
  );
}
