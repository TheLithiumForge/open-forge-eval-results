import { useState } from 'react';
import { TOURNAMENT_MAX_BYTES } from './format.ts';
import { TournamentControl } from './tournament-labels.ts';
import '../controls/control.css';

interface ExchangeProps {
  exportJson(): string;
  load(text: string): boolean;
  statusId: string;
}

// On every tournament screen. The draft stays in the box when a load is refused.
export function Exchange({ exportJson, load, statusId }: ExchangeProps) {
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
        <button type="button" className="control" onClick={() => setText(exportJson())}>
          {TournamentControl.exportJson}
        </button>
        <button
          type="button"
          className="control"
          aria-describedby={statusId}
          onClick={() => load(text)}
        >
          {TournamentControl.loadJson}
        </button>
      </div>
    </div>
  );
}
