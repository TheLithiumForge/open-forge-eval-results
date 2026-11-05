export function Exchange({
  text,
  change,
  exportData,
  load,
  notice,
}: {
  text: string;
  change(text: string): void;
  exportData(): void;
  load(): void;
  notice: string;
}) {
  return (
    <section className="tournament-section">
      <label htmlFor="tournament-json">Tournament JSON</label>
      <textarea
        id="tournament-json"
        className="control tournament-json"
        maxLength={262144}
        value={text}
        onChange={(event) => change(event.currentTarget.value)}
      />
      <div className="tournament-actions">
        <button type="button" className="control" onClick={exportData}>
          Export tournament
        </button>
        <button
          type="button"
          className="control"
          onClick={load}
          aria-describedby="tournament-notice"
        >
          Load tournament
        </button>
      </div>
      {notice && <p id="tournament-notice">{notice}</p>}
    </section>
  );
}
