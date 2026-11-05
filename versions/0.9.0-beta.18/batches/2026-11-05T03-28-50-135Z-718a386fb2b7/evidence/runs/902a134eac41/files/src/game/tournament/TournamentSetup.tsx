import './tournament.css';

interface TournamentSetupProps {
  playerCount: 4 | 8;
  names: readonly string[];
  notice: string;
  setPlayerCount(playerCount: 4 | 8): void;
  setName(index: number, name: string): void;
  start(): void;
}

export function TournamentSetup({
  playerCount,
  names,
  notice,
  setPlayerCount,
  setName,
  start,
}: TournamentSetupProps) {
  return (
    <section className="tournament-setup" aria-labelledby="tournament-setup-heading">
      <h3 id="tournament-setup-heading">Set up tournament</h3>
      <div className="tournament-player-count">
        <label htmlFor="tournament-players">Players</label>
        <select
          id="tournament-players"
          className="control"
          value={playerCount}
          onChange={(event) => setPlayerCount(Number(event.currentTarget.value) === 8 ? 8 : 4)}
        >
          <option value={4}>4</option>
          <option value={8}>8</option>
        </select>
      </div>
      <div className="tournament-player-fields">
        {Array.from({ length: playerCount }, (_, index) => (
          <div className="tournament-player-field" key={index}>
            <label htmlFor={`tournament-player-${index + 1}`}>Player {index + 1}</label>
            <input
              id={`tournament-player-${index + 1}`}
              className="control"
              type="text"
              autoComplete="off"
              value={names[index] ?? ''}
              onChange={(event) => setName(index, event.currentTarget.value)}
            />
          </div>
        ))}
      </div>
      {notice && <p className="tournament-notice">{notice}</p>}
      <button type="button" className="control tournament-action" onClick={start}>
        Start tournament
      </button>
    </section>
  );
}
