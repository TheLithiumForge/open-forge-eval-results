import { useState } from 'react';
import { TOURNAMENT_MAX_BYTES } from './format.ts';

interface ExchangeProps {
  exportJSON(): string;
  load(text: string): string;
  publish(text: string): void;
  loadNotice: string;
}

export function Exchange({ exportJSON, load, publish, loadNotice }: ExchangeProps) {
  const [draft, setDraft] = useState('');
  const [notice, setNotice] = useState('');
  return (
    <section className="tournament-exchange" aria-label="Tournament sharing">
      <div className="tournament-field">
        <label htmlFor="tournament-json">Tournament JSON</label>
        <textarea
          id="tournament-json"
          className="control"
          rows={6}
          maxLength={TOURNAMENT_MAX_BYTES}
          value={draft}
          spellCheck={false}
          onChange={(event) => setDraft(event.currentTarget.value)}
        />
      </div>
      <div className="tournament-actions">
        <button type="button" className="control" onClick={() => setDraft(exportJSON())}>
          Export tournament
        </button>
        <button
          type="button"
          className="control"
          aria-describedby="tournament-load-notice"
          onClick={() => {
            const text = load(draft);
            setNotice(text);
            if (text) publish(text);
          }}
        >
          Load tournament
        </button>
      </div>
      <p id="tournament-load-notice">{notice || loadNotice}</p>
    </section>
  );
}
