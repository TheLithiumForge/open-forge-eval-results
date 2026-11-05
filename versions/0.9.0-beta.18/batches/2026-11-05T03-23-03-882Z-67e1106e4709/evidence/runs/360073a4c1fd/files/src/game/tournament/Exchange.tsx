import { TOURNAMENT_MAX_BYTES } from './format.ts';

interface ExchangeProps {
  draft: string;
  change(text: string): void;
  exportTournament(): void;
  load(): void;
  notice: string;
}
export function Exchange({ draft, change, exportTournament, load, notice }: ExchangeProps) {
  return (
    <section className="tournament-exchange" aria-label="Tournament sharing">
      <label htmlFor="tournament-json">Tournament JSON</label>
      <textarea
        id="tournament-json"
        className="control"
        value={draft}
        rows={6}
        spellCheck={false}
        maxLength={TOURNAMENT_MAX_BYTES}
        onChange={(event) => change(event.currentTarget.value)}
      />
      <div className="tournament-actions">
        <button className="control" onClick={exportTournament}>
          Export tournament
        </button>
        <button className="control" aria-describedby="tournament-load-notice" onClick={load}>
          Load tournament
        </button>
      </div>
      <p id="tournament-load-notice">{notice}</p>
    </section>
  );
}
