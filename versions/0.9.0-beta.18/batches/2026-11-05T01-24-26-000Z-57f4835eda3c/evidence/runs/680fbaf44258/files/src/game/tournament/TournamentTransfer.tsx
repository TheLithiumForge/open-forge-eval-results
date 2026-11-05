import { useState } from 'react';
import { TOURNAMENT_MAX_BYTES } from './tournament-format.ts';
import { TournamentControl } from './tournament-labels.ts';
import '../controls/control.css';

interface TournamentTransferProps {
  exportText(): string;
  load(text: string): void;
}

// Stays mounted across every tournament screen, so a load keeps focus on its button.
export function TournamentTransfer({ exportText, load }: TournamentTransferProps) {
  const [text, setText] = useState('');
  return (
    <section className="tournament-transfer" aria-labelledby="tournament-transfer-title">
      <h3 id="tournament-transfer-title">{TournamentControl.transfer}</h3>
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
        <button type="button" className="control" onClick={() => setText(exportText())}>
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
    </section>
  );
}
