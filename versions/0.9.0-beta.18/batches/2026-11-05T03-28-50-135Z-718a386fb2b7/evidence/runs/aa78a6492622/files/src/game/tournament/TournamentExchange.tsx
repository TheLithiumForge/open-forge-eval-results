import { useState } from 'react';
import type { TournamentDraft, TournamentLoad } from './format.ts';
import '../controls/control.css';

interface TournamentExchangeProps {
  draft: TournamentDraft;
  exportTournament(draft: TournamentDraft): string;
  loadTournament(text: string): TournamentLoad | null;
  onSetupLoaded(draft: TournamentDraft): void;
}

export function TournamentExchange({
  draft,
  exportTournament,
  loadTournament,
  onSetupLoaded,
}: TournamentExchangeProps) {
  const [text, setText] = useState('');
  function exportJson(): void {
    setText(exportTournament(draft));
  }
  function loadJson(): void {
    const loaded = loadTournament(text);
    if (loaded?.kind === 'setup') onSetupLoaded(loaded.draft);
  }
  return (
    <section className="tournament-exchange" aria-labelledby="tournament-json-heading">
      <h3 id="tournament-json-heading">Tournament JSON</h3>
      <label htmlFor="tournament-json">Tournament JSON</label>
      <textarea
        id="tournament-json"
        className="control"
        rows={8}
        maxLength={262_144}
        spellCheck={false}
        value={text}
        onChange={(event) => setText(event.currentTarget.value)}
      />
      <div className="tournament-actions">
        <button className="control" type="button" onClick={exportJson}>
          Export tournament
        </button>
        <button className="control" type="button" onClick={loadJson}>
          Load tournament
        </button>
      </div>
    </section>
  );
}
