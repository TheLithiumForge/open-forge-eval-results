import { useState } from 'react';
import { TOURNAMENT_MAX_BYTES } from './format.ts';

interface ExchangeProps {
  notice: string;
  exportTournament(): string;
  loadTournament(text: string): void;
}

export function Exchange({ notice, exportTournament, loadTournament }: ExchangeProps) {
  const [draft, setDraft] = useState('');
  return (
    <section className="tournament-exchange" aria-label="Tournament data">
      <label htmlFor="tournament-json">Tournament JSON</label>
      <textarea
        id="tournament-json"
        className="control"
        rows={7}
        maxLength={TOURNAMENT_MAX_BYTES}
        spellCheck={false}
        value={draft}
        onChange={(event) => setDraft(event.currentTarget.value)}
      />
      <div className="tournament-actions">
        <button type="button" className="control" onClick={() => setDraft(exportTournament())}>
          Export tournament
        </button>
        <button
          type="button"
          className="control"
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
