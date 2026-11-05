import './tournament.css';

interface TournamentToolsProps {
  json: string;
  hasNotice: boolean;
  onJson(value: string): void;
  onExport(): void;
  onLoad(): void;
}

export function TournamentTools({
  json,
  hasNotice,
  onJson,
  onExport,
  onLoad,
}: TournamentToolsProps) {
  return (
    <section className="tournament-tools" aria-labelledby="tournament-json-heading">
      <h3 id="tournament-json-heading">Tournament data</h3>
      <label htmlFor="tournament-json">Tournament JSON</label>
      <textarea
        id="tournament-json"
        className="control"
        rows={8}
        maxLength={262144}
        value={json}
        onChange={(event) => onJson(event.currentTarget.value)}
      />
      <div className="tournament-actions">
        <button type="button" className="control" onClick={onExport}>
          Export tournament
        </button>
        <button
          type="button"
          className="control"
          aria-describedby={hasNotice ? 'tournament-status' : undefined}
          onClick={onLoad}
        >
          Load tournament
        </button>
      </div>
    </section>
  );
}
