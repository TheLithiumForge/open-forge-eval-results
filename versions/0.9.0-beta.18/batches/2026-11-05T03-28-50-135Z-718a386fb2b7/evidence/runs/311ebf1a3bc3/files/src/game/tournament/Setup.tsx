import { useState } from 'react';
import type { TournamentData } from './rules.ts';

interface SetupProps {
  history: TournamentData[];
  blocked: boolean;
  start(drafts: string[], count: number): void;
  back(): void;
  open(item: TournamentData): void;
}
export function Setup({ history, blocked, start, back, open }: SetupProps) {
  const [count, setCount] = useState(4);
  const [drafts, setDrafts] = useState<string[]>(Array(8).fill(''));
  return (
    <>
      <label htmlFor="players">Players</label>{' '}
      <select
        id="players"
        className="control"
        value={count}
        onChange={(e) => setCount(Number(e.currentTarget.value))}
      >
        <option value={4}>4</option>
        <option value={8}>8</option>
      </select>
      <div className="player-fields">
        {drafts.slice(0, count).map((draft, i) => (
          <div key={i}>
            <label htmlFor={`player-${i}`}>Player {i + 1}</label>
            <input
              className="control"
              id={`player-${i}`}
              value={draft}
              onChange={(e) => {
                const copy = [...drafts];
                copy[i] = e.currentTarget.value;
                setDrafts(copy);
              }}
            />
          </div>
        ))}
      </div>
      <div className="tournament-actions">
        <button className="control" type="button" onClick={() => start(drafts, count)}>
          Start tournament
        </button>
        <button className="control" type="button" onClick={back}>
          Back to game
        </button>
      </div>
      <h3>Past tournaments</h3>
      {blocked && <p>Progress won't be saved on this device.</p>}
      {history.length === 0 ? (
        <p>No past tournaments yet.</p>
      ) : (
        <ul>
          {history.map((item, i) => (
            <li key={i}>
              <button
                className="control"
                type="button"
                onClick={() => {
                  open(item);
                }}
              >
                Champion: {item.players[item.matches[item.index]!.winner!]}
              </button>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
