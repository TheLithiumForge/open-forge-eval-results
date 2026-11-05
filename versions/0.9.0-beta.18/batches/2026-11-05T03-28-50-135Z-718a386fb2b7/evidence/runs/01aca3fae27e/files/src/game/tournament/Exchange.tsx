export function Exchange({
  draft,
  setDraft,
  notice,
  exportData,
  load,
}: {
  draft: string;
  setDraft(text: string): void;
  notice: string;
  exportData(): void;
  load(): void;
}) {
  return (
    <div className="exchange">
      <label htmlFor="tournament-json">Tournament JSON</label>
      <textarea
        id="tournament-json"
        className="control"
        rows={7}
        value={draft}
        onChange={(e) => setDraft(e.currentTarget.value)}
      />
      <div className="exchange-buttons">
        <button className="control" type="button" onClick={exportData}>
          Export tournament
        </button>
        <button className="control" type="button" onClick={load}>
          Load tournament
        </button>
      </div>
      <p>{notice}</p>
    </div>
  );
}
