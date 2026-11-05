import { useState } from 'react';
import { readTournament, TOURNAMENT_MAX_BYTES } from './format.ts';
import type { TournamentArchive } from './format.ts';

interface ExchangeProps {
  exportTournament(): string;
  load(archive: TournamentArchive): void;
  notice(text: string): void;
  loadNotice: string;
}

export function Exchange({ exportTournament, load, notice, loadNotice }: ExchangeProps) {
  const [draft, setDraft] = useState('');
  return (
    <section className="tournament-exchange" aria-label="Tournament sharing">
      <div className="tournament-field">
        <label htmlFor="tournament-json">Tournament JSON</label>
        <textarea
          id="tournament-json"
          className="control"
          rows={6}
          maxLength={TOURNAMENT_MAX_BYTES}
          spellCheck={false}
          value={draft}
          onChange={(event) => setDraft(event.currentTarget.value)}
        />
      </div>
      <div className="tournament-actions">
        <button className="control" type="button" onClick={() => setDraft(exportTournament())}>
          Export tournament
        </button>
        <button
          className="control"
          type="button"
          aria-describedby="tournament-load-notice"
          onClick={() => {
            const result = readTournament(draft);
            if (result.archive) load(result.archive);
            else notice(result.error);
          }}
        >
          Load tournament
        </button>
      </div>
      <p id="tournament-load-notice">{loadNotice}</p>
    </section>
  );
}
