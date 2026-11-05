import { useState } from 'react';

interface ExchangeProps {
  exportTournament(): string;
  load(text: string): void;
}

export function Exchange({ exportTournament, load }: ExchangeProps) {
  const [draft, setDraft] = useState('');
  return (
    <div className="tournament-exchange">
      <label htmlFor="tournament-json">Tournament JSON</label>
      <textarea
        id="tournament-json"
        className="control"
        rows={8}
        spellCheck={false}
        value={draft}
        onChange={(event) => setDraft(event.currentTarget.value)}
      />
      <div className="tournament-actions">
        <button type="button" className="control" onClick={() => setDraft(exportTournament())}>
          Export tournament
        </button>
        <button type="button" className="control" onClick={() => load(draft)}>
          Load tournament
        </button>
      </div>
    </div>
  );
}
