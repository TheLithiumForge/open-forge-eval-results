import { TOURNAMENT_MAX_BYTES } from './format.ts';

interface ExchangeProps {
  draft: string;
  change(text: string): void;
  exportTournament(): void;
  load(): void;
}

export function Exchange({ draft, change, exportTournament, load }: ExchangeProps) {
  return (
    <div className="tournament-exchange">
      <label htmlFor="tournament-json">Tournament JSON</label>
      <textarea
        className="control"
        id="tournament-json"
        rows={5}
        maxLength={TOURNAMENT_MAX_BYTES}
        spellCheck={false}
        value={draft}
        onChange={(event) => change(event.currentTarget.value)}
      />
      <div className="tournament-actions">
        <button className="control" type="button" onClick={exportTournament}>
          Export tournament
        </button>
        <button
          className="control"
          type="button"
          onClick={load}
          aria-describedby="tournament-notice"
        >
          Load tournament
        </button>
      </div>
    </div>
  );
}
