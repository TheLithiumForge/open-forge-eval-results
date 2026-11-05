import { useState } from 'react';
import { TOURNAMENT_MAX_BYTES } from './tournament-format.ts';
import { TournamentControl, TournamentText } from './tournament-labels.ts';
import '../controls/control.css';
import './tournament.css';

interface TransferPanelProps {
  exportTournament(): string | null;
  loadTournament(text: string): void;
}

// Shown on every tournament screen. The box keeps its text while the tournament changes.
export function TransferPanel({ exportTournament, loadTournament }: TransferPanelProps) {
  const [text, setText] = useState('');
  return (
    <section className="transfer" aria-labelledby="transfer-heading">
      <h3 id="transfer-heading">{TournamentText.transfer}</h3>
      <label htmlFor="tournament-json">{TournamentControl.json}</label>
      <textarea
        id="tournament-json"
        className="control"
        rows={6}
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
            const json = exportTournament();
            if (json !== null) setText(json);
          }}
        >
          {TournamentControl.exportTournament}
        </button>
        <button type="button" className="control" onClick={() => loadTournament(text)}>
          {TournamentControl.loadTournament}
        </button>
      </div>
    </section>
  );
}
