interface ExchangeProps {
  json: string;
  setJson(value: string): void;
  onExport(): void;
  load(): void;
}
export function Exchange({ json, setJson, onExport, load }: ExchangeProps) {
  return (
    <section className="tournament-exchange">
      <label htmlFor="tournament-json">Tournament JSON</label>
      <textarea
        id="tournament-json"
        className="control"
        value={json}
        onChange={(e) => setJson(e.currentTarget.value)}
        maxLength={65536}
        rows={6}
      />
      <div className="tournament-actions">
        <button
          className="control"
          type="button"
          onClick={() => {
            onExport();
          }}
        >
          Export tournament
        </button>
        <button className="control" type="button" onClick={load}>
          Load tournament
        </button>
      </div>
    </section>
  );
}
