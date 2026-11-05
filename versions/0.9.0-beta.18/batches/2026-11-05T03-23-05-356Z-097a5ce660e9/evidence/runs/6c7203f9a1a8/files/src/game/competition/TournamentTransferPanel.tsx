interface TournamentTransferPanelProps {
  json: string;
  onChange(value: string): void;
  onExport(): void;
  onLoad(): void;
}

export function TournamentTransferPanel({
  json,
  onChange,
  onExport,
  onLoad,
}: TournamentTransferPanelProps) {
  return (
    <section className="tournament-transfer" aria-labelledby="tournament-json-heading">
      <h3 id="tournament-json-heading">Tournament JSON</h3>
      <label htmlFor="tournament-json">Tournament JSON</label>
      <textarea
        id="tournament-json"
        className="control"
        rows={8}
        maxLength={65_536}
        value={json}
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
    </section>
  );
}
