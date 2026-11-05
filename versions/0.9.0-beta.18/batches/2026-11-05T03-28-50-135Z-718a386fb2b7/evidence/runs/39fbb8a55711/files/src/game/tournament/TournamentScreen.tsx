import { useEffect, useRef, useState } from 'react';
import { BracketTable } from './BracketTable.tsx';
import { ActiveTournament } from './ActiveTournament.tsx';
import { freshTournamentDeals } from './fresh-deals.ts';
import {
  decodeTournamentCollection,
  encodeTournamentCollection,
  MAX_TOURNAMENT_JSON_CHARACTERS,
  readTournamentHistory,
  retainRecentTournaments,
  tournamentIdentity,
  unknownTournamentField,
  writeTournamentHistory,
} from './format.ts';
import { createTournament } from './rules.ts';
import { validateTournamentNames } from './names.ts';
import type { Tournament, TournamentRecord } from './rules.ts';
import { TournamentSetup } from './TournamentSetup.tsx';
import './tournament.css';

interface TournamentScreenProps {
  backToGame(): void;
}

export function TournamentScreen({ backToGame }: TournamentScreenProps) {
  const [initialHistory] = useState(readTournamentHistory);
  const [history, setHistory] = useState<readonly TournamentRecord[]>(initialHistory.tournaments);
  const [storageUnavailable, setStorageUnavailable] = useState(initialHistory.unavailable);
  const [active, setActive] = useState<Tournament | null>(null);
  const [formError, setFormError] = useState('');
  const [json, setJson] = useState('');
  const [announcement, setAnnouncement] = useState({ id: 0, message: '' });
  const title = useRef<HTMLHeadingElement>(null);

  useEffect(() => title.current?.focus(), []);

  function announce(message: string): void {
    setAnnouncement((current) => ({ id: current.id + 1, message }));
  }

  function start(names: readonly string[], count: 4 | 8): void {
    const validation = validateTournamentNames(names);
    if (validation.error) {
      setFormError(validation.error);
      announce(validation.error);
      return;
    }
    try {
      const tournament = createTournament(validation.names, freshTournamentDeals(count));
      setFormError('');
      setActive(tournament);
      const firstMatch = tournament.matches[0];
      const firstSeed = firstMatch?.players[0];
      const firstName = tournament.players.find((player) => player.seed === firstSeed)?.name;
      announce(firstName ? `Now playing: ${firstName}` : 'Tournament started.');
    } catch {
      announce('Could not create tournament deals. Try again.');
    }
  }

  function saveFinished(record: TournamentRecord): void {
    const next = retainRecentTournaments([record, ...history]);
    setHistory(next);
    setStorageUnavailable(!writeTournamentHistory(next));
  }

  function exportHistory(): void {
    setJson(encodeTournamentCollection(history));
    announce('Tournament history exported to the JSON box.');
  }

  function loadHistory(): void {
    const imported = decodeTournamentCollection(json);
    if (!imported) {
      const unknown = unknownTournamentField(json);
      announce(unknown ? `Unknown field: ${unknown}.` : 'Invalid tournament JSON.');
      return;
    }
    const next = retainRecentTournaments([...imported, ...history]);
    setHistory(next);
    setStorageUnavailable(!writeTournamentHistory(next));
    announce(`Loaded ${imported.length} ${imported.length === 1 ? 'tournament' : 'tournaments'}.`);
  }

  return (
    <section className="tournament-screen" aria-labelledby="tournament-title">
      <h2 id="tournament-title" ref={title} tabIndex={-1}>
        Tournament
      </h2>
      <p role="status" aria-live="polite" aria-atomic="true" id="tournament-status">
        <span key={announcement.id}>{announcement.message}</span>
      </p>
      {active ? (
        <ActiveTournament
          initial={active}
          backToGame={backToGame}
          onAnnouncement={announce}
          onFinished={saveFinished}
        />
      ) : (
        <TournamentSetup error={formError} onBack={backToGame} start={start} />
      )}
      <section className="tournament-exchange" aria-labelledby="tournament-json-title">
        <h3 id="tournament-json-title">Tournament JSON</h3>
        <label htmlFor="tournament-json">Tournament JSON</label>
        <textarea
          id="tournament-json"
          className="control"
          rows={7}
          maxLength={MAX_TOURNAMENT_JSON_CHARACTERS}
          spellCheck={false}
          value={json}
          onChange={(event) => setJson(event.currentTarget.value)}
        />
        <div className="tournament-actions">
          <button className="control" type="button" onClick={exportHistory}>
            Export tournament
          </button>
          <button
            className="control"
            type="button"
            aria-describedby="tournament-status"
            onClick={loadHistory}
          >
            Load tournament
          </button>
        </div>
        <p className="tournament-exchange-help">
          The JSON contains finished tournaments in the Past tournaments list.
        </p>
      </section>
      <section className="tournament-history" aria-labelledby="past-tournaments-title">
        <h3 id="past-tournaments-title">Past tournaments</h3>
        {storageUnavailable && <p>Progress won't be saved on this device.</p>}
        {history.length === 0 ? (
          <p>No past tournaments yet.</p>
        ) : (
          <ol>
            {history.map((record) => {
              const champion =
                record.players.find((player) => player.seed === record.championSeed)?.name ??
                'Unknown player';
              return (
                <li key={tournamentIdentity(record)}>
                  <details>
                    <summary>
                      Champion: {champion} · {record.players.length} players
                    </summary>
                    <BracketTable matches={record.matches} players={record.players} />
                  </details>
                </li>
              );
            })}
          </ol>
        )}
      </section>
    </section>
  );
}
