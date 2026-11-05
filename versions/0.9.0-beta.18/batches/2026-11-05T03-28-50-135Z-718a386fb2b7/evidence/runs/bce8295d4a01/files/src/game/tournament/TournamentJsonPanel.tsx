import { useState } from 'react';

interface TournamentJsonPanelProps {
  exportText(): string | null;
  loadText(text: string): { readonly ok: boolean; readonly message: string };
  announce(text: string): void;
}

export function TournamentJsonPanel({ exportText, loadText, announce }: TournamentJsonPanelProps) {
  const [text, setText] = useState('');
  const [notice, setNotice] = useState('');

  function exportTournament(): void {
    const result = exportText();
    if (result === null) {
      setNotice('There is no tournament to export.');
      return;
    }
    setText(result);
    setNotice('Tournament exported.');
  }

  function loadTournament(): void {
    const result = loadText(text);
    setNotice(result.message);
    if (!result.ok) announce(result.message);
  }

  return (
    <section className="tournament-json" aria-labelledby="tournament-json-heading">
      <h3 id="tournament-json-heading">Tournament exchange</h3>
      <label htmlFor="tournament-json">Tournament JSON</label>
      <textarea
        id="tournament-json"
        className="control"
        rows={8}
        maxLength={65_536}
        value={text}
        onChange={(event) => setText(event.currentTarget.value)}
      />
      <div className="tournament-actions">
        <button type="button" className="control" onClick={exportTournament}>
          Export tournament
        </button>
        <button
          type="button"
          className="control"
          onClick={loadTournament}
          aria-describedby="tournament-json-notice"
        >
          Load tournament
        </button>
      </div>
      <p id="tournament-json-notice" className="tournament-notice">
        {notice}
      </p>
    </section>
  );
}
