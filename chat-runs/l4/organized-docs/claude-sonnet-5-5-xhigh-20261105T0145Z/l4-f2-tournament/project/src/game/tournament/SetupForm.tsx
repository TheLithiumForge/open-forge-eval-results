import { PLAYER_COUNTS } from './rules.ts';
import { TournamentControl } from './tournament-labels.ts';
import type { PlayerCount } from './rules.ts';
import '../controls/control.css';
import './tournament.css';

interface SetupFormProps {
  count: PlayerCount;
  drafts: readonly string[];
  setCount(count: number): void;
  setName(index: number, draft: string): void;
  start(): boolean;
  started(): void;
}

export function SetupForm({ count, drafts, setCount, setName, start, started }: SetupFormProps) {
  return (
    <form
      className="setup"
      onSubmit={(event) => {
        event.preventDefault();
        if (start()) started();
      }}
    >
      <div className="setup-count">
        <label htmlFor="tournament-players">{TournamentControl.players}</label>
        <select
          id="tournament-players"
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
      <div className="setup-names">
        {drafts.slice(0, count).map((draft, index) => (
          <div key={index} className="setup-name">
            <label htmlFor={`player-${index + 1}`}>{`Player ${index + 1}`}</label>
            <input
              id={`player-${index + 1}`}
              className="control"
              name={`player${index + 1}`}
              value={draft}
              autoComplete="off"
              spellCheck={false}
              onChange={(event) => setName(index, event.currentTarget.value)}
            />
          </div>
        ))}
      </div>
      <button type="submit" className="control">
        {TournamentControl.start}
      </button>
    </form>
  );
}
