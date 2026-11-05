import { useState } from 'react';
import { TOURNAMENT_MAX_BYTES } from './exchange.ts';
import { TournamentControl } from './tournament-labels.ts';
import '../controls/control.css';
import './tournament.css';

interface TournamentExchangeProps {
  exportText(): string | null;
  load(text: string): boolean;
  notice: string;
}

// The draft stays editable after a failed load. The notice describes the latest action here.
export function TournamentExchange({ exportText, load, notice }: TournamentExchangeProps) {
  const [text, setText] = useState('');
  return (
    <div className="tournament-exchange">
      <label htmlFor="tournament-json">{TournamentControl.json}</label>
      <textarea
        id="tournament-json"
        className="control"
        rows={5}
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
            const exported = exportText();
            if (exported !== null) setText(exported);
          }}
        >
          {TournamentControl.exportTournament}
        </button>
        <button
          type="button"
          className="control"
          aria-describedby="tournament-notice"
          onClick={() => load(text)}
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
