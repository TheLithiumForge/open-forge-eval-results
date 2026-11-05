interface SetupProps {
  players: readonly string[];
  change(players: readonly string[]): void;
  start(): void;
  notice: string;
}

export function Setup({ players, change, start, notice }: SetupProps) {
  return (
    <form
      className="tournament-setup"
      onSubmit={(event) => {
        event.preventDefault();
        start();
      }}
    >
      <div className="tournament-field">
        <label htmlFor="player-count">Players</label>
        <select
          id="player-count"
          className="control"
          value={players.length}
          onChange={(event) => {
            const count = Number(event.currentTarget.value);
            change(Array.from({ length: count }, (_, index) => players[index] ?? ''));
          }}
        >
          <option value="4">4</option>
          <option value="8">8</option>
        </select>
      </div>
      <div className="tournament-names">
        {players.map((name, index) => (
          <div className="tournament-field" key={index}>
            <label htmlFor={`player-${index + 1}`}>Player {index + 1}</label>
            <input
              id={`player-${index + 1}`}
              className="control"
              value={name}
              aria-describedby="tournament-notice"
              onChange={(event) =>
                change(
                  players.map((item, position) =>
                    position === index ? event.currentTarget.value : item,
                  ),
                )
              }
            />
          </div>
        ))}
      </div>
      <p className="help">Use 2 to 20 characters per name. Each name must be different.</p>
      <p id="tournament-notice">{notice}</p>
      <button className="control" type="submit">
        Start tournament
      </button>
    </form>
  );
}
