import { useState } from 'react';
import { TOURNAMENT_MAX_BYTES } from './format.ts';

interface ExchangeProps {
  exportTournament(): string;
  load(text: string): string;
}

export function Exchange({ exportTournament, load }: ExchangeProps) {
  const [draft, setDraft] = useState('');
  const [notice, setNotice] = useState('');
  return (
    <section className="tournament-exchange" aria-label="Tournament sharing">
      <div className="tournament-field">
        <label htmlFor="tournament-json">Tournament JSON</label>
        <textarea
          id="tournament-json"
          className="control"
          rows={8}
          value={draft}
          spellCheck={false}
          maxLength={TOURNAMENT_MAX_BYTES}
          onChange={(event) => setDraft(event.currentTarget.value)}
        />
      </div>
      <div className="tournament-actions">
        <button type="button" className="control" onClick={() => setDraft(exportTournament())}>
          Export tournament
        </button>
        <button
          type="button"
          className="control"
          aria-describedby="tournament-load-notice"
          onClick={() => setNotice(load(draft))}
        >
          Load tournament
        </button>
      </div>
      <p id="tournament-load-notice">{notice}</p>
    </section>
  );
}
