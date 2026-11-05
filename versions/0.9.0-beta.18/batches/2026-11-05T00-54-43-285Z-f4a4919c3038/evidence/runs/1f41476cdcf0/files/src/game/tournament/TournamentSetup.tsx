import type { TournamentController } from '../session/use-tournament.ts';

export function TournamentSetupForm({ controller }: { controller: TournamentController }) {
  const { setup, setSetup, errors } = controller;
  return (
    <form
      className="tournament-setup"
      onSubmit={(event) => {
        event.preventDefault();
        controller.start();
      }}
      noValidate
    >
      <p>Play the same deal in each match. Fewer moves wins; ties use active time, then seed.</p>
      <label htmlFor="tournament-players">Players</label>
      <select
        id="tournament-players"
        className="control"
        value={setup.count}
        onChange={(event) => setSetup({ ...setup, count: Number(event.currentTarget.value) })}
      >
        <option value="4">4</option>
        <option value="8">8</option>
      </select>
      <div className="tournament-names">
        {setup.names.slice(0, setup.count).map((name, index) => (
          <div className="tournament-field" key={index}>
            <label htmlFor={`player-${index + 1}`}>Player {index + 1}</label>
            <input
              id={`player-${index + 1}`}
              className="control"
              value={name}
              autoComplete="off"
              aria-invalid={Boolean(errors[index])}
              aria-describedby={errors[index] ? `player-error-${index}` : undefined}
              onChange={(event) =>
                setSetup({
                  ...setup,
                  names: setup.names.map((value, place) =>
                    place === index ? event.currentTarget.value : value,
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
