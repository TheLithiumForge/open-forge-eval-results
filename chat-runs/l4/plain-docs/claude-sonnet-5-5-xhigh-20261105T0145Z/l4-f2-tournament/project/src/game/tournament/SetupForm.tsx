import { PLAYER_COUNTS } from './rules.ts';
import { TournamentControl } from './tournament-labels.ts';
import '../controls/control.css';
import './tournament.css';

interface SetupFormProps {
  count: number;
  names: readonly string[];
  invalid: readonly number[];
  setCount(count: number): void;
  setName(index: number, name: string): void;
  start(): void;
}

export function SetupForm({ count, names, invalid, setCount, setName, start }: SetupFormProps) {
  return (
    <form
      className="setup"
      onSubmit={(event) => {
        event.preventDefault();
        start();
      }}
    >
      <div className="size-control">
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
      {names.slice(0, count).map((name, index) => (
        <div className="field" key={index}>
          <label htmlFor={`player-${index + 1}`}>{`Player ${index + 1}`}</label>
          <input
            id={`player-${index + 1}`}
            className="control"
            name={`player${index + 1}`}
            value={name}
            autoComplete="off"
            spellCheck={false}
            aria-invalid={invalid.includes(index) || undefined}
            aria-describedby={invalid.includes(index) ? 'turn-status' : undefined}
            onChange={(event) => setName(index, event.currentTarget.value)}
          />
        </div>
      ))}
      <button type="submit" className="control">
        {TournamentControl.start}
      </button>
    </form>
  );
}
