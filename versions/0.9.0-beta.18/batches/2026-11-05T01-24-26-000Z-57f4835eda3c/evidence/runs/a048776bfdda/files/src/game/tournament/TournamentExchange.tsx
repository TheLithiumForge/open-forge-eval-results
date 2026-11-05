import { useState } from 'react';
import { TOURNAMENT_MAX_BYTES } from './format.ts';
import { TournamentControl } from './tournament-labels.ts';
import '../controls/control.css';
import './tournament.css';

interface TournamentExchangeProps {
  exportTournament(): string;
  load(text: string): void;
}

// The draft stays while the screen changes, so a failed load can be corrected and tried again.
export function TournamentExchange({ exportTournament, load }: TournamentExchangeProps) {
  const [draft, setDraft] = useState('');
  return (
    <div className="tournament-exchange">
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
        <button type="button" className="control" onClick={() => setDraft(exportTournament())}>
          {TournamentControl.exportTournament}
        </button>
        <button type="button" className="control" onClick={() => load(draft)}>
          {TournamentControl.loadTournament}
        </button>
      </div>
    </div>
  );
}
