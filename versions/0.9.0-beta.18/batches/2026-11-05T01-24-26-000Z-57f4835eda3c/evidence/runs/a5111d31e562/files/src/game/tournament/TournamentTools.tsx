import { useState } from 'react';
import { TournamentControl } from './tournament-labels.ts';
import '../controls/control.css';
import './tournament.css';

const TOURNAMENT_MAX_CHARACTERS = 65_536;

interface TournamentToolsProps {
  exportTournament(): string | null;
  loadDraft(text: string): void;
  notice: string;
}

// The draft stays for correction after a refused load, like the snapshot draft.
export function TournamentTools({ exportTournament, loadDraft, notice }: TournamentToolsProps) {
  const [draft, setDraft] = useState('');
  return (
    <div className="tournament-tools">
      <label htmlFor="tournament-json">{TournamentControl.json}</label>
      <textarea
        id="tournament-json"
        className="control"
        rows={5}
        value={draft}
        maxLength={TOURNAMENT_MAX_CHARACTERS}
        spellCheck={false}
        onChange={(event) => setDraft(event.currentTarget.value)}
      />
      <div className="tournament-actions">
        <button
          type="button"
          className="control"
          aria-describedby="tournament-notice"
          onClick={() => {
            const text = exportTournament();
            if (text !== null) setDraft(text);
          }}
        >
          {TournamentControl.exportTournament}
        </button>
        <button
          type="button"
          className="control"
          aria-describedby="tournament-notice"
          onClick={() => loadDraft(draft)}
        >
          {TournamentControl.loadTournament}
        </button>
      </div>
      <p id="tournament-notice" className="tournament-notice">
        {notice}
      </p>
    </div>
  );
}
