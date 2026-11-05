import { useState } from 'react';
import { TOURNAMENT_MAX_BYTES } from './format.ts';
import { TournamentControl } from './tournament-labels.ts';

interface TournamentDataProps {
  exportJson(): string | null;
  loadJson(text: string): boolean;
}

// The draft stays for correction when a load fails. Export needs no Clipboard API.
export function TournamentData({ exportJson, loadJson }: TournamentDataProps) {
  const [draft, setDraft] = useState('');
  function exported(): void {
    const text = exportJson();
    if (text !== null) setDraft(text);
  }
  return (
    <div className="tournament-data">
      <label htmlFor="tournament-json">{TournamentControl.json}</label>
      <textarea
        id="tournament-json"
        className="control"
        rows={5}
        value={draft}
        maxLength={TOURNAMENT_MAX_BYTES}
        spellCheck={false}
        onChange={(event) => setDraft(event.currentTarget.value)}
      />
      <div className="tournament-actions">
        <button type="button" className="control" onClick={exported}>
          {TournamentControl.exportJson}
        </button>
        <button type="button" className="control" onClick={() => loadJson(draft)}>
          {TournamentControl.loadJson}
        </button>
      </div>
    </div>
  );
}
