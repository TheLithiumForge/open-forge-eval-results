import { useState } from 'react';
import { readTournament } from './format.ts';
import type { RefObject } from 'react';
import type { TournamentData } from './tournament.ts';

interface Props {
  data: TournamentData | null;
  count: number;
  names: string[];
  turn: RefObject<{ exportSnapshot(): string } | null>;
  load(data: TournamentData): void;
  loadSetup(count: number, names: string[]): void;
  notice(message: string): void;
}
export function Transfer({ data, count, names, turn, load, loadSetup, notice }: Props) {
  const [json, setJson] = useState('');
  function exportTournament(): void {
    if (!data) setJson(JSON.stringify({ version: 1, setup: true, count, names }, null, 2));
    else {
      const snapshot = data.phase === 'playing' ? turn.current?.exportSnapshot() : null;
      if (data.phase === 'playing' && !snapshot) {
        notice('The turn is still starting. Try again.');
        return;
      }
      setJson(JSON.stringify({ ...data, snapshot: snapshot ?? null }, null, 2));
    }
    notice('Tournament exported to the Tournament JSON box.');
  }
  function loadTournament(): void {
    const loaded = readTournament(json);
    if (loaded) {
      load(loaded);
      notice('Tournament loaded.');
      return;
    }
    try {
      const setup: unknown = JSON.parse(json);
      if (
        typeof setup === 'object' &&
        setup !== null &&
        'version' in setup &&
        setup.version === 1 &&
        'setup' in setup &&
        setup.setup === true &&
        'count' in setup &&
        (setup.count === 4 || setup.count === 8) &&
        'names' in setup &&
        Array.isArray(setup.names) &&
        setup.names.length === 8 &&
        setup.names.every((name: unknown) => typeof name === 'string' && name.length <= 100)
      ) {
        loadSetup(setup.count, setup.names);
        notice('Tournament setup loaded.');
        return;
      }
    } catch {
      /* Show the same message for all invalid input. */
    }
    notice('Invalid tournament JSON.');
  }
  return (
    <section className="tournament-transfer">
      <h2>Tournament JSON</h2>
      <label htmlFor="tournament-json">Tournament JSON</label>
      <textarea
        id="tournament-json"
        className="control"
        value={json}
        onChange={(event) => setJson(event.currentTarget.value)}
        rows={6}
      />
      <div className="tournament-actions">
        <button className="control" onClick={exportTournament}>
          Export tournament
        </button>
        <button className="control" onClick={loadTournament}>
          Load tournament
        </button>
      </div>
    </section>
  );
}
