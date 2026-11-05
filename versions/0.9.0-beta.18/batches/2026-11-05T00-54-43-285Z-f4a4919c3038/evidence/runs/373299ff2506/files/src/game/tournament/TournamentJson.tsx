import { useState } from 'react';
import { TOURNAMENT_JSON_MAX } from './tournament-document.ts';

interface TournamentJsonProps {
  exportTournament(): string;
  load(text: string): boolean;
}

export function TournamentJson({ exportTournament, load }: TournamentJsonProps) {
  const [text, setText] = useState('');
  const [notice, setNotice] = useState('');
  return (
    <section className="tournament-json" aria-label="Tournament import and export">
      <label htmlFor="tournament-json">Tournament JSON</label>
      <textarea
        id="tournament-json"
        className="control"
        rows={5}
        value={text}
        maxLength={TOURNAMENT_JSON_MAX}
        spellCheck={false}
        onChange={(event) => setText(event.currentTarget.value)}
      />
      <div className="control-row">
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
          aria-describedby="tournament-notice"
          onClick={() => {
            setNotice(
              load(text)
                ? 'Tournament loaded. Select Start turn to continue an unfinished turn.'
                : 'Invalid tournament JSON.',
            );
          }}
        >
          Load tournament
        </button>
      </div>
      <p id="tournament-notice" role="status" aria-live="polite" aria-atomic="true">
        {notice}
      </p>
    </section>
  );
}
