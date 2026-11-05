import { useState } from 'react';
import type { ReactNode } from 'react';
import { Bracket } from './Bracket.tsx';
import { currentMatch, currentPlayer } from './tournament.ts';
import type { Tournament } from './tournament.ts';
import './tournament.css';

interface Props {
  children: ReactNode;
  tournament: Tournament | null;
  past: Tournament[];
  start(names: string[]): void;
  startTurn(): void;
  next(): void;
  leave(): void;
  showPast(tournament: Tournament): void;
  exportTournament(): string;
  load(text: string): boolean;
}

export function TournamentScreen({
  children,
  tournament,
  past,
  start,
  startTurn,
  next,
  leave,
  showPast,
  exportTournament,
  load,
}: Props) {
  const [count, setCount] = useState(4);
  const [names, setNames] = useState(Array.from({ length: 8 }, () => ''));
  const [json, setJson] = useState('');
  const [notice, setNotice] = useState('');
  const activeNames = names.slice(0, count);
  return (
    <section className="tournament" aria-label="Tournament">
      <h2>Tournament</h2>
      {!tournament ? (
        <>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              start(activeNames.map((name) => name.trim()));
            }}
          >
            <label htmlFor="players">Players</label>
            <select
              id="players"
              className="control"
              value={count}
              onChange={(event) => setCount(Number(event.currentTarget.value))}
            >
              <option value={4}>4</option>
              <option value={8}>8</option>
            </select>
            <div className="player-inputs">
              {activeNames.map((name, index) => (
                <label key={index}>
                  Player {index + 1}
                  <input
                    className="control"
                    value={name}
                    required
                    maxLength={100}
                    onChange={(event) => {
                      const value = event.currentTarget.value;
                      setNames((previous) =>
                        previous.map((item, position) => (position === index ? value : item)),
                      );
                    }}
                  />
                </label>
              ))}
            </div>
            <button
              className="control"
              type="submit"
              disabled={activeNames.some((name) => !name.trim())}
            >
              Start tournament
            </button>
          </form>
          <h3>Past tournaments</h3>
          {past.length === 0 ? (
            <p>No finished tournaments yet.</p>
          ) : (
            <ul>
              {past.map((item, index) => (
                <li key={index}>
                  <button className="control" type="button" onClick={() => showPast(item)}>
                    Champion: {item.names[currentMatch(item).winner ?? 0]}
                  </button>
                </li>
              ))}
            </ul>
          )}
          <button className="control" type="button" onClick={leave}>
            Back to game
          </button>
        </>
      ) : (
        <>
          {tournament.phase === 'complete' ? (
            <>
              <p className="champion">
                Champion: {tournament.names[currentMatch(tournament).winner ?? 0]}
              </p>
              <button className="control" type="button" onClick={leave}>
                Back to game
              </button>
            </>
          ) : (
            <>
              {(tournament.phase === 'ready' || tournament.phase === 'playing') && (
                <p className="now-playing">
                  Now playing: {tournament.names[currentPlayer(tournament)]}
                </p>
              )}
              {tournament.phase === 'ready' && (
                <button className="control" type="button" onClick={startTurn}>
                  Start turn
                </button>
              )}
              {tournament.phase === 'turnEnd' && (
                <button className="control" type="button" onClick={next}>
                  Next turn
                </button>
              )}
              {tournament.phase === 'matchEnd' && (
                <button className="control" type="button" onClick={next}>
                  Next match
                </button>
              )}
              <button className="control" type="button" onClick={leave}>
                Leave tournament
              </button>
            </>
          )}
          {children}
          <p>
            Fewer moves wins. If moves are tied, the faster time wins; an exact tie goes to the
            first player.
          </p>
          <Bracket tournament={tournament} />
        </>
      )}
      <div className="tournament-transfer">
        <label htmlFor="tournament-json">Tournament JSON</label>
        <textarea
          id="tournament-json"
          className="control"
          rows={5}
          value={json}
          onChange={(event) => setJson(event.currentTarget.value)}
        />
        <div className="tournament-actions">
          <button
            className="control"
            type="button"
            onClick={() => {
              const value = exportTournament();
              setJson(value);
              setNotice(value ? 'Tournament exported.' : 'Start or select a tournament to export.');
            }}
          >
            Export tournament
          </button>
          <button
            className="control"
            type="button"
            onClick={() =>
              setNotice(load(json) ? 'Tournament loaded.' : 'Invalid tournament JSON.')
            }
          >
            Load tournament
          </button>
        </div>
        <p role="status">{notice}</p>
      </div>
    </section>
  );
}
