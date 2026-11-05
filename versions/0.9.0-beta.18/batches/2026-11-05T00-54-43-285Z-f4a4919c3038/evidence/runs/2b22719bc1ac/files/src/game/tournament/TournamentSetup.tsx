import { normalizeName } from './names.ts';

interface TournamentSetupProps {
  names: readonly string[];
  change(names: readonly string[]): void;
  start(): void;
}

export function TournamentSetup({ names, change, start }: TournamentSetupProps) {
  return (
    <form
      className="tournament-setup"
      onSubmit={(event) => {
        event.preventDefault();
        start();
      }}
    >
      <label htmlFor="tournament-players">Players</label>
      <select
        id="tournament-players"
        className="control"
        value={names.length}
        onChange={(event) =>
          change(
            Array.from({ length: Number(event.currentTarget.value) }, (_, i) => names[i] ?? ''),
          )
        }
      >
        <option value="4">4</option>
        <option value="8">8</option>
      </select>
      <div className="tournament-names">
        {names.map((name, i) => (
          <div className="tournament-field" key={i}>
            <label htmlFor={`player-${i + 1}`}>Player {i + 1}</label>
            <input
              id={`player-${i + 1}`}
              className="control"
              value={name}
              aria-describedby="tournament-notice"
              autoComplete="off"
              onChange={(event) =>
                change(
                  names.map((value, index) => (index === i ? event.currentTarget.value : value)),
                )
              }
              onBlur={() =>
                change(names.map((value, index) => (index === i ? normalizeName(value) : value)))
              }
            />
          </div>
        ))}
      </div>
      <button className="control" type="submit">
        Start tournament
      </button>
    </form>
  );
}
