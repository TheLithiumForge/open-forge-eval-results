interface Props {
  json: string;
  edit(value: string): void;
  load(): void;
  exportData(): void;
}
export function ExchangePanel({ json, edit, load, exportData }: Props) {
  return (
    <section className="tournament-section">
      <label htmlFor="tournament-json">Tournament JSON</label>
      <textarea
        id="tournament-json"
        maxLength={65536}
        className="control tournament-json"
        value={json}
        onChange={(event) => edit(event.target.value)}
      />
      <div className="tournament-actions">
        <button className="control" onClick={exportData}>
          Export tournament
        </button>
        <button className="control" onClick={load}>
          Load tournament
        </button>
      </div>
    </section>
  );
}
