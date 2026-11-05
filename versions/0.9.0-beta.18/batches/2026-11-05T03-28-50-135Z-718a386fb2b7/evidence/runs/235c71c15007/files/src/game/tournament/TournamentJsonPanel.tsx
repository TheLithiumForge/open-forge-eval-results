interface TournamentJsonPanelProps {
  readonly json: string;
  readonly onExport: () => void;
  readonly onJsonChange: (value: string) => void;
  readonly onLoad: () => void;
}

export function TournamentJsonPanel({ json, onExport, onJsonChange, onLoad }: TournamentJsonPanelProps) {
  return (
    <section className="tournament-exchange" aria-labelledby="tournament-json-title">
      <h3 id="tournament-json-title">Tournament data</h3>
      <label htmlFor="tournament-json">Tournament JSON</label>
      <textarea
        id="tournament-json"
        className="control tournament-json"
        value={json}
        maxLength={65_536}
        spellCheck={false}
        onChange={(event) => onJsonChange(event.currentTarget.value)}
      />
      <div className="tournament-actions">
        <button className="control" type="button" onClick={onExport}>Export tournament</button>
        <button className="control" type="button" onClick={onLoad}>Load tournament</button>
      </div>
    </section>
  );
}
