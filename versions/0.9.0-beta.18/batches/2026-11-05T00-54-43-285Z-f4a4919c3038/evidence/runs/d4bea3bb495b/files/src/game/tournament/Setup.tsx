import { normalizePlayerName, playerNamesError } from './rules.ts';
import type { TournamentSetup } from './model.ts';

interface SetupProps {
  setup: TournamentSetup;
  change(setup: TournamentSetup): void;
  start(names: readonly string[]): void;
  notice(text: string): void;
}

export function Setup({ setup, change, start, notice }: SetupProps) {
  return (
    <form
      className="tournament-setup"
      onSubmit={(event) => {
        event.preventDefault();
        const names = setup.names.map(normalizePlayerName);
        const error = playerNamesError(names);
        if (error) notice(error);
        else {
          change({ ...setup, names });
          start(names);
        }
      }}
    >
      <label htmlFor="tournament-players">Players</label>
      <select
        className="control"
        id="tournament-players"
        value={setup.count}
        onChange={(event) => {
          const count = event.currentTarget.value === '8' ? 8 : 4;
          change({
            count,
            names: Array.from({ length: count }, (_, index) => setup.names[index] ?? ''),
          });
        }}
      >
        <option value="4">4</option>
        <option value="8">8</option>
      </select>
      <div className="tournament-names">
        {setup.names.map((name, index) => (
          <div className="tournament-field" key={index}>
            <label htmlFor={`player-${index + 1}`}>Player {index + 1}</label>
            <input
              className="control"
              id={`player-${index + 1}`}
              value={name}
              autoComplete="off"
              aria-describedby="tournament-notice"
              onChange={(event) =>
                change({
                  ...setup,
                  names: setup.names.map((value, position) =>
                    position === index ? event.currentTarget.value : value,
                  ),
                })
              }
            />
          </div>
        ))}
      </div>
      <p className="help">Fewer moves wins. Ties use active time, then entry seed.</p>
      <button className="control" type="submit" aria-describedby="tournament-notice">
        Start tournament
      </button>
    </form>
  );
}
