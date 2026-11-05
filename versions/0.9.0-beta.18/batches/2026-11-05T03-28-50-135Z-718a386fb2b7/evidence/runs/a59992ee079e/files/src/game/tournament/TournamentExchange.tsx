import { useState } from 'react';

interface TournamentExchangeProps {
  exportJson(): string;
  loadJson(text: string): boolean;
}

export function TournamentExchange({ exportJson, loadJson }: TournamentExchangeProps) {
  const [text, setText] = useState('');
  return (
    <section className="tournament-exchange" aria-labelledby="tournament-json-title">
      <h3 id="tournament-json-title">Tournament JSON</h3>
      <label htmlFor="tournament-json">Tournament JSON</label>
      <textarea
        id="tournament-json"
        className="control"
        rows={6}
        maxLength={65_536}
        spellCheck={false}
        value={text}
        onChange={(event) => setText(event.currentTarget.value)}
      />
      <div className="tournament-actions">
        <button
          type="button"
          className="control"
          onClick={() => {
            const output = exportJson();
            if (output) setText(output);
          }}
        >
          Export tournament
        </button>
        <button type="button" className="control" onClick={() => loadJson(text)}>
          Load tournament
        </button>
      </div>
    </section>
  );
}
