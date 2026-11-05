import { useState } from 'react';
import { isPlayerCount, PLAYER_COUNTS } from './rules.ts';
import { playerLabel, TournamentControl } from './tournament-labels.ts';
import '../controls/control.css';
import './tournament.css';

interface TournamentSetupProps {
  start(drafts: readonly string[]): void;
  back(): void;
}

const MOST_PLAYERS = Math.max(...PLAYER_COUNTS);

// Drafts stay as typed. Start tournament checks them and stores the accepted names.
export function TournamentSetup({ start, back }: TournamentSetupProps) {
  const [count, setCount] = useState<number>(PLAYER_COUNTS[0]);
  const [drafts, setDrafts] = useState<readonly string[]>(() =>
    Array.from({ length: MOST_PLAYERS }, () => ''),
  );
  return (
    <form
      className="tournament-setup"
      onSubmit={(event) => {
        event.preventDefault();
        start(drafts.slice(0, count));
      }}
    >
      <div className="setup-count">
        <label htmlFor="tournament-players">{TournamentControl.players}</label>
        <select
          id="tournament-players"
          className="control"
          value={count}
          onChange={(event) => {
            const value = Number(event.currentTarget.value);
            if (isPlayerCount(value)) setCount(value);
          }}
        >
          {PLAYER_COUNTS.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </div>
      <div className="setup-names">
        {drafts.slice(0, count).map((draft, index) => (
          <div key={index} className="setup-name">
            <label htmlFor={`tournament-player-${index + 1}`}>{playerLabel(index)}</label>
            <input
              id={`tournament-player-${index + 1}`}
              className="control"
              value={draft}
              autoComplete="off"
              spellCheck={false}
              onChange={(event) => {
                const value = event.currentTarget.value;
                setDrafts((list) => list.map((item, other) => (other === index ? value : item)));
              }}
            />
          </div>
        ))}
      </div>
      <div className="tournament-actions">
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
