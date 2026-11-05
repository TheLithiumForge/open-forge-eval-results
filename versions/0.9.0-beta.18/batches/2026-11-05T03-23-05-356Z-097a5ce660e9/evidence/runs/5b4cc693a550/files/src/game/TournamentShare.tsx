export function TournamentShare({
  json,
  setJson,
  load,
  exportData,
  notice,
}: {
  json: string;
  setJson(value: string): void;
  load(): void;
  exportData(): void;
  notice: string;
}) {
  return (
    <section className="tournament-exchange">
      <h3>Share tournament</h3>
      <label htmlFor="tournament-json">Tournament JSON</label>
      <textarea
        className="control"
        id="tournament-json"
        rows={8}
        value={json}
        onChange={(e) => setJson(e.target.value)}
      />
      <p id="tournament-load-notice">
        {notice !== 'Use 2 to 20 characters.' && notice !== 'Each name must be different.'
          ? notice
          : ''}
      </p>
      <div className="tournament-actions">
        <button className="control" type="button" onClick={exportData}>
          Export tournament
        </button>
        <button
          className="control"
          type="button"
          onClick={load}
          aria-describedby="tournament-load-notice"
        >
          Load tournament
        </button>
      </div>
    </section>
  );
}
