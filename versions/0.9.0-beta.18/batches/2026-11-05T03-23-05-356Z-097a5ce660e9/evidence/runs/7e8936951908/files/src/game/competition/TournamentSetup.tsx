interface TournamentSetupProps {
  readonly playerCount: 4 | 8;
  readonly names: readonly string[];
  setPlayerCount(value: number): void;
  editName(index: number, value: string): void;
  startTournament(): void;
}

export function TournamentSetup({
  playerCount,
  names,
  setPlayerCount,
  editName,
  startTournament,
}: TournamentSetupProps) {
  return (
    <form
      className="tournament-setup"
      onSubmit={(event) => {
        event.preventDefault();
        startTournament();
      }}
    >
      <div className="tournament-count">
        <label htmlFor="tournament-player-count">Players</label>
        <select
          id="tournament-player-count"
          className="control"
          value={playerCount}
          onChange={(event) => setPlayerCount(Number(event.currentTarget.value))}
        >
          <option value={4}>4</option>
          <option value={8}>8</option>
        </select>
      </div>
      <div className="tournament-names">
        {names.slice(0, playerCount).map((name, index) => (
          <div key={index}>
            <label htmlFor={`tournament-player-${index + 1}`}>Player {index + 1}</label>
            <input
              id={`tournament-player-${index + 1}`}
              className="control"
              type="text"
              value={name}
              onChange={(event) => editName(index, event.currentTarget.value)}
              autoComplete="off"
            />
          </div>
        ))}
      </div>
      <button type="submit" className="control">
        Start tournament
      </button>
    </form>
  );
}
