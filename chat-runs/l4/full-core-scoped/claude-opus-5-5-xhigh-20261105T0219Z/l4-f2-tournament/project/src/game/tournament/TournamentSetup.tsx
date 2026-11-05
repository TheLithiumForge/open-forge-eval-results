import { useState } from 'react';
import { playerLabel, TournamentControl } from './labels.ts';
import { PLAYER_COUNTS } from './rules.ts';
import '../controls/control.css';
import './tournament.css';

const LARGEST = Math.max(...PLAYER_COUNTS);

interface TournamentSetupProps {
  // The entry that blocked the last start, or null.
  invalidEntry: number | null;
  start(drafts: readonly string[]): void;
  back(): void;
}

// Keeps every draft while the player count changes, so switching back restores the names.
export function TournamentSetup({ invalidEntry, start, back }: TournamentSetupProps) {
  const [count, setCount] = useState<number>(PLAYER_COUNTS[0]);
  const [drafts, setDrafts] = useState<readonly string[]>(() =>
    Array.from({ length: LARGEST }, () => ''),
  );
  return (
    <form
      className="tournament-form"
      onSubmit={(event) => {
        event.preventDefault();
        start(drafts.slice(0, count));
      }}
    >
      <div className="tournament-field-row">
        <label htmlFor="player-count">{TournamentControl.players}</label>
        <select
          id="player-count"
          className="control"
          value={count}
          onChange={(event) => setCount(Number(event.currentTarget.value))}
        >
          {PLAYER_COUNTS.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </div>
      <div className="player-fields">
        {drafts.slice(0, count).map((draft, index) => (
          <div key={index} className="tournament-field">
            <label htmlFor={`player-${index + 1}`}>{playerLabel(index + 1)}</label>
            <input
              id={`player-${index + 1}`}
              className="control"
              value={draft}
              aria-invalid={invalidEntry === index}
              autoComplete="off"
              spellCheck={false}
              onChange={(event) => {
                const value = event.currentTarget.value;
                setDrafts((current) =>
                  current.map((item, position) => (position === index ? value : item)),
                );
              }}
            />
          </div>
        ))}
      </div>
      <div className="tournament-row">
        <button type="submit" className="control">
          {TournamentControl.start}
        </button>
        <button type="button" className="control" onClick={back}>
          {TournamentControl.back}
        </button>
      </div>
    </form>
  );
}
