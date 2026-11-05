import { PLAYER_COUNTS } from './bracket.ts';
import { TournamentControl } from './tournament-labels.ts';
import type { TournamentController } from './use-tournament.ts';
import '../controls/control.css';
import './tournament.css';

interface TournamentSetupProps {
  setup: TournamentController['setup'];
  start(): void;
}

// Names are typed in entry order, which sets the seeds. Enter in a name field also starts.
export function TournamentSetup({ setup, start }: TournamentSetupProps) {
  return (
    <form
      className="tournament-setup"
      onSubmit={(event) => {
        event.preventDefault();
        start();
      }}
    >
      <div className="tournament-field">
        <label htmlFor="tournament-players">{TournamentControl.players}</label>
        <select
          id="tournament-players"
          className="control"
          value={setup.count}
          onChange={(event) => setup.setCount(Number(event.currentTarget.value))}
        >
          {PLAYER_COUNTS.map((count) => (
            <option key={count} value={count}>
              {count}
            </option>
          ))}
        </select>
      </div>
      <div className="tournament-players">
        {setup.drafts.slice(0, setup.count).map((draft, index) => (
          <div className="tournament-field" key={index}>
            <label htmlFor={`tournament-player-${index + 1}`}>
              {`${TournamentControl.player} ${index + 1}`}
            </label>
            <input
              id={`tournament-player-${index + 1}`}
              className="control"
              value={draft}
              spellCheck={false}
              autoComplete="off"
              onChange={(event) => setup.setDraft(index, event.currentTarget.value)}
            />
          </div>
        ))}
      </div>
      <div className="tournament-actions">
        <button type="submit" className="control">
          {TournamentControl.start}
        </button>
      </div>
    </form>
  );
}
