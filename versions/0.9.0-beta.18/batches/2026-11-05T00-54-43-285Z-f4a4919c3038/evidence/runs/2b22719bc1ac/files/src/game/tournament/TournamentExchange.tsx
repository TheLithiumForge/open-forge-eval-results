import { TOURNAMENT_MAX_BYTES } from './format.ts';

interface TournamentExchangeProps {
  json: string;
  change(text: string): void;
  exportCurrent(): void;
  load(): void;
  notice: string;
}
export function TournamentExchange({
  json,
  change,
  exportCurrent,
  load,
  notice,
}: TournamentExchangeProps) {
  return (
    <section className="tournament-exchange" aria-label="Tournament exchange">
      <label htmlFor="tournament-json">Tournament JSON</label>
      <textarea
        className="control"
        id="tournament-json"
        value={json}
        maxLength={TOURNAMENT_MAX_BYTES}
        onChange={(event) => change(event.currentTarget.value)}
      />
      <div className="tournament-actions">
        <button className="control" type="button" onClick={exportCurrent}>
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
      <p id="tournament-notice">{notice}</p>
    </section>
  );
}
