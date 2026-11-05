import { useState } from 'react';
import { TOURNAMENT_MAX_BYTES } from './exchange.ts';
import { TournamentControl } from './tournament-labels.ts';
import '../controls/control.css';
import './tournament.css';

interface TournamentExchangeProps {
  exportText(): string;
  load(text: string): void;
}

// The draft lives here, so it survives every change of screen state inside a tournament.
export function TournamentExchange({ exportText, load }: TournamentExchangeProps) {
  const [text, setText] = useState('');
  return (
    <section className="exchange">
      <label htmlFor="tournament-json">{TournamentControl.json}</label>
      <textarea
        id="tournament-json"
        className="control"
        rows={8}
        value={text}
        maxLength={TOURNAMENT_MAX_BYTES}
        spellCheck={false}
        onChange={(event) => setText(event.currentTarget.value)}
      />
      <div className="control-row">
        <button type="button" className="control" onClick={() => setText(exportText())}>
          {TournamentControl.exportJson}
        </button>
        <button type="button" className="control" onClick={() => load(text)}>
          {TournamentControl.loadJson}
        </button>
      </div>
    </section>
  );
}
