import { useState } from 'react';
import { TOURNAMENT_JSON_LIMIT } from './tournament-format.ts';

interface TournamentTransferProps {
  exportTournament(): string;
  loadTournament(text: string): void;
}

export function TournamentTransfer({ exportTournament, loadTournament }: TournamentTransferProps) {
  const [json, setJson] = useState('');
  return (
    <section className="tournament-transfer" aria-label="Save or load a tournament">
      <label htmlFor="tournament-json">Tournament JSON</label>
      <textarea
        id="tournament-json"
        className="control"
        rows={5}
        value={json}
        maxLength={TOURNAMENT_JSON_LIMIT}
        spellCheck={false}
        onChange={(event) => setJson(event.currentTarget.value)}
      />
      <div className="control-row">
        <button type="button" className="control" onClick={() => setJson(exportTournament())}>
          Export tournament
        </button>
        <button type="button" className="control" onClick={() => loadTournament(json)}>
          Load tournament
        </button>
      </div>
    </section>
  );
}
