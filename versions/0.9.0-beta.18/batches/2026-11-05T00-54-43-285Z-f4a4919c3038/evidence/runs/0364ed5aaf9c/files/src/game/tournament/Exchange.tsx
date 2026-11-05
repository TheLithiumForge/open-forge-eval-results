import { useState } from 'react';
import { TOURNAMENT_MAX_BYTES } from './format.ts';

interface ExchangeProps {
  exportTournament(): string;
  loadTournament(text: string): void;
  notice: string;
}

export function TournamentExchange({ exportTournament, loadTournament, notice }: ExchangeProps) {
  const [draft, setDraft] = useState('');
  return (
    <section className="tournament-exchange" aria-label="Tournament sharing">
      <label htmlFor="tournament-json">Tournament JSON</label>
      <textarea
        id="tournament-json"
        className="control"
        rows={6}
        value={draft}
        maxLength={TOURNAMENT_MAX_BYTES}
        onChange={(event) => setDraft(event.currentTarget.value)}
      />
      <div className="tournament-actions">
        <button className="control" type="button" onClick={() => setDraft(exportTournament())}>
          Export tournament
        </button>
        <button
          className="control"
          type="button"
          aria-describedby="tournament-load-notice"
          onClick={() => loadTournament(draft)}
        >
          Load tournament
        </button>
      </div>
      <p id="tournament-load-notice">{notice}</p>
    </section>
  );
}
