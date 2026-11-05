import { useState } from 'react';
import { decodeTournament, TOURNAMENT_MAX_BYTES } from './format.ts';
import type { TournamentDocument } from './format.ts';

interface ExchangeProps {
  exportTournament(): string;
  load(document: TournamentDocument): void;
  announce(message: string): void;
}

export function Exchange({ exportTournament, load, announce }: ExchangeProps) {
  const [text, setText] = useState('');
  const [notice, setNotice] = useState('');
  function importTournament(): void {
    const result = decodeTournament(text);
    if (typeof result === 'string') {
      setNotice(result);
      announce(result);
      return;
    }
    load(result);
    setNotice('');
  }
  return (
    <section className="tournament-exchange" aria-label="Tournament sharing">
      <label htmlFor="tournament-json">Tournament JSON</label>
      <textarea
        id="tournament-json"
        className="control"
        rows={6}
        value={text}
        maxLength={TOURNAMENT_MAX_BYTES}
        spellCheck={false}
        onChange={(event) => setText(event.currentTarget.value)}
      />
      <div className="tournament-actions">
        <button
          type="button"
          className="control"
          onClick={() => {
            setText(exportTournament());
            setNotice('Tournament exported.');
          }}
        >
          Export tournament
        </button>
        <button
          type="button"
          className="control"
          aria-describedby="tournament-load-notice"
          onClick={importTournament}
        >
          Load tournament
        </button>
      </div>
      <p id="tournament-load-notice">{notice}</p>
    </section>
  );
}
