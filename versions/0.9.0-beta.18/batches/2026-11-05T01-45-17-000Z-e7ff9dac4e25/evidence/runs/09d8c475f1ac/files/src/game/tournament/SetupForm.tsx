import { PLAYER_COUNTS } from './rules.ts';
import { playerLabel, TournamentControl } from './tournament-labels.ts';
import '../controls/control.css';

interface SetupFormProps {
  count: number;
  names: readonly string[];
  setCount(count: number): void;
  rename(index: number, name: string): void;
  start(): boolean;
  back(): void;
  statusId: string;
}

export function SetupForm({
  count,
  names,
  setCount,
  rename,
  start,
  back,
  statusId,
}: SetupFormProps) {
  return (
    <form
      className="tournament-form"
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
        {names.slice(0, count).map((name, index) => (
          <div className="tournament-field" key={index}>
            <label htmlFor={`player-${index + 1}`}>{playerLabel(index + 1)}</label>
            <input
              id={`player-${index + 1}`}
              className="control"
              value={name}
              autoComplete="off"
              onChange={(event) => rename(index, event.currentTarget.value)}
            />
          </div>
        ))}
      </div>
      <div className="tournament-actions">
        <button type="submit" className="control" aria-describedby={statusId}>
          {TournamentControl.start}
        </button>
        <button type="button" className="control" onClick={back}>
          {TournamentControl.back}
        </button>
      </div>
    </form>
  );
}
