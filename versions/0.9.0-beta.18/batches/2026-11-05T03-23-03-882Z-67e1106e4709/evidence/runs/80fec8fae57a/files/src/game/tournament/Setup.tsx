import { nameError } from './names.ts';

interface SetupProps {
  names: readonly string[];
  change(names: readonly string[]): void;
  start(names: readonly string[]): void;
  publish(message: string): void;
  error: string;
}

export function Setup({ names, change, start, publish, error }: SetupProps) {
  return (
    <form
      className="tournament-setup"
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        const problem = nameError(names);
        if (problem) publish(problem);
        else start(names);
      }}
    >
      <p>
        Share one device. Both players play the same deal. Fewer moves wins; ties use active time,
        then seed order.
      </p>
      <div className="tournament-field">
        <label htmlFor="tournament-players">Players</label>
        <select
          id="tournament-players"
          className="control"
          value={names.length}
          onChange={(event) =>
            change(
              Array.from(
                { length: Number(event.currentTarget.value) },
                (_, index) => names[index] ?? '',
              ),
            )
          }
        >
          <option value="4">4</option>
          <option value="8">8</option>
        </select>
      </div>
      <div className="tournament-names">
        {names.map((name, index) => (
          <div className="tournament-field" key={index}>
            <label htmlFor={`player-${index}`}>Player {index + 1}</label>
            <input
              id={`player-${index}`}
              className="control"
              value={name}
              autoComplete="off"
              aria-describedby={error ? 'tournament-error' : undefined}
              onChange={(event) =>
                change(
                  names.map((value, position) =>
                    position === index ? event.currentTarget.value : value,
                  ),
                )
              }
            />
          </div>
        ))}
      </div>
      <p id="tournament-error">{error}</p>
      <button type="submit" className="control">
        Start tournament
      </button>
    </form>
  );
}
