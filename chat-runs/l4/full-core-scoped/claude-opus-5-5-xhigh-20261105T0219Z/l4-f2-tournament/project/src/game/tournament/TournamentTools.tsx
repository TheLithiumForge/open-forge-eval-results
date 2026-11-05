import { useState } from 'react';
import { TournamentControl } from './labels.ts';
import '../controls/control.css';
import './tournament.css';

const TOURNAMENT_MAX_CHARACTERS = 65_536;

interface TournamentToolsProps {
  exportTournament(): string | null;
  load(text: string): void;
}

// The draft stays for correction after a failed load. Outcomes go to the game's status line.
export function TournamentTools({ exportTournament, load }: TournamentToolsProps) {
  const [draft, setDraft] = useState('');
  return (
    <section className="tournament-tools">
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
      <div className="tournament-row">
        <button
          type="button"
          className="control"
          onClick={() => {
            const text = exportTournament();
            if (text !== null) setDraft(text);
          }}
        >
          {TournamentControl.exportTournament}
        </button>
        <button type="button" className="control" onClick={() => load(draft)}>
          {TournamentControl.loadTournament}
        </button>
      </div>
    </section>
  );
}
