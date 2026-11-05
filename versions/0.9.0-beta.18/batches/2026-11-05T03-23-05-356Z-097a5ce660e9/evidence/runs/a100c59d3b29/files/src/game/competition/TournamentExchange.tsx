import { TOURNAMENT_JSON_MAX_BYTES } from './format.ts';

interface TournamentExchangeProps {
  readonly value: string;
  onChange(value: string): void;
  onExport(): string;
  onLoad(value: string): void;
}

export function TournamentExchange({ value, onChange, onExport, onLoad }: TournamentExchangeProps) {
  function exportTournament(): void {
    onChange(onExport());
  }
  return (
    <section className="tournament-exchange" aria-labelledby="tournament-exchange-heading">
      <h3 id="tournament-exchange-heading">Share a tournament</h3>
      <label htmlFor="tournament-json">Tournament JSON</label>
      <textarea
        id="tournament-json"
        className="control"
        rows={8}
        maxLength={TOURNAMENT_JSON_MAX_BYTES}
        spellCheck={false}
        value={value}
        onChange={(event) => onChange(event.currentTarget.value)}
      />
      <div className="tournament-actions">
        <button type="button" className="control" onClick={exportTournament}>
          Export tournament
        </button>
        <button type="button" className="control" onClick={() => onLoad(value)}>
          Load tournament
        </button>
      </div>
    </section>
  );
}
