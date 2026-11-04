import { useState } from 'react';
import type { FormEvent } from 'react';
import type { GameSession } from '../session/use-game-session.ts';
import './SnapshotControl.css';

interface SnapshotControlProps {
  readonly session: GameSession;
}

export function SnapshotControl({ session }: SnapshotControlProps) {
  const [draft, setDraft] = useState('');

  function exportSnapshot(): void {
    setDraft(session.exportSnapshot());
  }

  function importSnapshot(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    session.loadSnapshot(draft);
  }

  return (
    <div className="snapshot-control">
      <label htmlFor="snapshot-json">Snapshot JSON</label>
      <textarea
        id="snapshot-json"
        maxLength={65_536}
        value={draft}
        onChange={(event) => setDraft(event.currentTarget.value)}
        spellCheck={false}
      />
      <div className="snapshot-actions">
        <button type="button" onClick={exportSnapshot}>Export snapshot</button>
        <form onSubmit={importSnapshot}>
          <button type="submit">Load snapshot</button>
        </form>
      </div>
    </div>
  );
}
