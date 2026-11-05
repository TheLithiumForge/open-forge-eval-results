import { useState } from 'react';
import { TournamentControl } from './tournament-labels.ts';
import '../controls/control.css';
import './tournament.css';

const JSON_MAX_CHARACTERS = 65_536;

interface ExchangePanelProps {
  exportTournament(): string;
  loadTournament(text: string): boolean;
}

// The draft lives here, so it stays while the screen around it changes.
export function ExchangePanel({ exportTournament, loadTournament }: ExchangePanelProps) {
  const [text, setText] = useState('');
  return (
    <div className="exchange">
      <label htmlFor="tournament-json">{TournamentControl.json}</label>
      <textarea
        id="tournament-json"
        className="control"
        rows={8}
        value={text}
        maxLength={JSON_MAX_CHARACTERS}
        spellCheck={false}
        onChange={(event) => setText(event.currentTarget.value)}
      />
      <div className="tournament-row">
        <button type="button" className="control" onClick={() => setText(exportTournament())}>
          {TournamentControl.exportTournament}
        </button>
        <button type="button" className="control" onClick={() => loadTournament(text)}>
          {TournamentControl.loadTournament}
        </button>
      </div>
    </div>
  );
}
