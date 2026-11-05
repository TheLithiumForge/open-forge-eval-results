import { useState } from 'react';
import { PLAYER_COUNTS } from './rules.ts';
import { TournamentControl } from './tournament-labels.ts';
import '../controls/control.css';
import './tournament.css';

const MOST_PLAYERS = Math.max(...PLAYER_COUNTS);

interface TournamentSetupProps {
  start(drafts: readonly string[]): void;
  back(): void;
}

// Drafts stay as typed. Start tournament accepts them, so the checks run on the accepted names.
export function TournamentSetup({ start, back }: TournamentSetupProps) {
  const [count, setCount] = useState<number>(PLAYER_COUNTS[0]);
  const [drafts, setDrafts] = useState(() => Array.from({ length: MOST_PLAYERS }, () => ''));
  return (
    <form
      className="tournament-setup"
      onSubmit={(event) => {
        event.preventDefault();
        start(drafts.slice(0, count));
      }}
    >
      <div className="tournament-field">
        <label htmlFor="tournament-players">{TournamentControl.players}</label>
        <select
          id="tournament-players"
          className="control"
          value={count}
          onChange={(event) => {
            const chosen = Number(event.currentTarget.value);
            if (PLAYER_COUNTS.some((option) => option === chosen)) setCount(chosen);
          }}
        >
          {PLAYER_COUNTS.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </div>
      <div className="tournament-names">
        {drafts.slice(0, count).map((draft, index) => (
          <div key={index} className="tournament-field">
            <label htmlFor={`tournament-player-${index + 1}`}>
              {TournamentControl.player} {index + 1}
            </label>
            <input
              id={`tournament-player-${index + 1}`}
              className="control"
              value={draft}
              autoComplete="off"
              spellCheck={false}
              onChange={(event) => {
                const value = event.currentTarget.value;
                setDrafts((previous) => previous.map((old, at) => (at === index ? value : old)));
              }}
            />
          </div>
        ))}
      </div>
      <div className="tournament-actions">
        <button type="submit" className="control" aria-describedby="result-status">
          {TournamentControl.start}
        </button>
        <button type="button" className="control" onClick={back}>
          {TournamentControl.back}
        </button>
      </div>
    </form>
  );
}
