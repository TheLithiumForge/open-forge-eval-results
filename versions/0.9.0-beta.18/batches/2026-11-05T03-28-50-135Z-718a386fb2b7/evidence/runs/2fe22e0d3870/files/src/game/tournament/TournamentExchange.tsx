import './tournament.css';

interface TournamentExchangeProps {
  value: string;
  change(value: string): void;
  exportTournament(): void;
  loadTournament(): void;
  notice: string;
}

export function TournamentExchange({
  value,
  change,
  exportTournament,
  loadTournament,
  notice,
}: TournamentExchangeProps) {
  return (
    <section className="tournament-exchange" aria-labelledby="tournament-json-title">
      <h3 id="tournament-json-title">Tournament JSON</h3>
      <label htmlFor="tournament-json">Tournament JSON</label>
      <textarea
        id="tournament-json"
        className="control"
        rows={7}
        maxLength={65_536}
        spellCheck={false}
        value={value}
        onChange={(event) => change(event.currentTarget.value)}
      />
      <p id="tournament-load-notice" className="tournament-message">
        {notice}
      </p>
      <div className="tournament-actions">
        <button className="control" type="button" onClick={exportTournament}>
          Export tournament
        </button>
        <button
          className="control"
          type="button"
          aria-describedby="tournament-load-notice"
          onClick={loadTournament}
        >
          Load tournament
        </button>
      </div>
    </section>
  );
}
