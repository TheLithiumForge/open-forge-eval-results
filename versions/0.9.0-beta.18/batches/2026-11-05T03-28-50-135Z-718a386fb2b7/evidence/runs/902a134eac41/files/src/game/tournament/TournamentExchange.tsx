import './tournament.css';

interface TournamentExchangeProps {
  value: string;
  notice: string;
  onChange(value: string): void;
  onExport(): void;
  onLoad(): void;
}

export function TournamentExchange({
  value,
  notice,
  onChange,
  onExport,
  onLoad,
}: TournamentExchangeProps) {
  return (
    <section className="tournament-exchange" aria-labelledby="tournament-exchange-heading">
      <h3 id="tournament-exchange-heading">Tournament JSON</h3>
      <label htmlFor="tournament-json">Tournament JSON</label>
      <textarea
        id="tournament-json"
        className="control"
        rows={10}
        spellCheck={false}
        value={value}
        onChange={(event) => onChange(event.currentTarget.value)}
      />
      <div className="tournament-actions">
        <button type="button" className="control" onClick={onExport}>
          Export tournament
        </button>
        <button type="button" className="control" onClick={onLoad}>
          Load tournament
        </button>
      </div>
      {notice && <p className="tournament-notice">{notice}</p>}
    </section>
  );
}
