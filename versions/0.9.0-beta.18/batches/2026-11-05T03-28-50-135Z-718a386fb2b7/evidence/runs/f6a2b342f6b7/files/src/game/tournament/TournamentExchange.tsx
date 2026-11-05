import { useState } from 'react';

interface TournamentExchangeProps {
  exportData(): string;
  load(text: string): boolean;
}

export function TournamentExchange({ exportData, load }: TournamentExchangeProps) {
  const [text, setText] = useState('');
  return (
    <section className="tournament-exchange" aria-labelledby="tournament-json-heading">
      <h3 id="tournament-json-heading">Tournament JSON</h3>
      <label htmlFor="tournament-json">Tournament JSON</label>
      <textarea
        id="tournament-json"
        className="control"
        rows={5}
        maxLength={65_536}
        spellCheck={false}
        value={text}
        onChange={(event) => setText(event.currentTarget.value)}
      />
      <div className="tournament-actions">
        <button type="button" className="control" onClick={() => setText(exportData())}>
          Export tournament
        </button>
        <button type="button" className="control" onClick={() => load(text)}>
          Load tournament
        </button>
      </div>
    </section>
  );
}
