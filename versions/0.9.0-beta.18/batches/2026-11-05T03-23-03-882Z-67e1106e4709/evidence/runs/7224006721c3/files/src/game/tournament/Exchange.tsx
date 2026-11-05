import { useState } from 'react';
import { TOURNAMENT_MAX_BYTES } from './format.ts';

interface ExchangeProps {
  exportDocument(): string;
  load(text: string): void;
  notice: string;
}

export function Exchange({ exportDocument, load, notice }: ExchangeProps) {
  const [draft, setDraft] = useState('');
  return (
    <section className="tournament-exchange" aria-label="Tournament import and export">
      <div className="tournament-field">
        <label htmlFor="tournament-json">Tournament JSON</label>
        <textarea
          className="control"
          id="tournament-json"
          rows={8}
          spellCheck={false}
          maxLength={TOURNAMENT_MAX_BYTES}
          value={draft}
          onChange={(event) => setDraft(event.currentTarget.value)}
        />
      </div>
      <div className="tournament-actions">
        <button type="button" className="control" onClick={() => setDraft(exportDocument())}>
          Export tournament
        </button>
        <button
          type="button"
          className="control"
          aria-describedby="tournament-notice"
          onClick={() => load(draft)}
        >
          Load tournament
        </button>
      </div>
      <p id="tournament-notice">{notice}</p>
    </section>
  );
}
