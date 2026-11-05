interface SetupProps {
  names: readonly string[];
  change(names: readonly string[]): void;
  start(): void;
  problem: string;
}

export function TournamentSetupForm({ names, change, start, problem }: SetupProps) {
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
            <label htmlFor={`tournament-player-${index}`}>Player {index + 1}</label>
            <input
              id={`tournament-player-${index}`}
              className="control"
              value={name}
              aria-describedby={problem ? 'tournament-problem' : undefined}
              onChange={(event) =>
                change(names.map((value, at) => (at === index ? event.currentTarget.value : value)))
              }
            />
          </div>
        ))}
      </div>
      {problem && <p id="tournament-problem">{problem}</p>}
      <button className="control" type="submit">
        Start tournament
      </button>
    </form>
  );
}
