import type { TournamentState } from './rules.ts';

interface SetupProps {
  state: TournamentState;
  problem: string;
  change(state: TournamentState): void;
  start(): void;
}

export function Setup({ state, problem, change, start }: SetupProps) {
  return (
    <form
      className="tournament-setup"
      onSubmit={(event) => {
        event.preventDefault();
        start();
      }}
    >
      <div className="tournament-field">
        <label htmlFor="tournament-players">Players</label>
        <select
          id="tournament-players"
          className="control"
          value={state.names.length}
          onChange={(event) =>
            change({
              ...state,
              names: Array.from(
                { length: Number(event.currentTarget.value) },
                (_, i) => state.names[i] ?? '',
              ),
            })
          }
        >
          <option value={4}>4</option>
          <option value={8}>8</option>
        </select>
      </div>
      <div className="tournament-names">
        {state.names.map((name, index) => (
          <div className="tournament-field" key={index}>
            <label htmlFor={`player-${index + 1}`}>Player {index + 1}</label>
            <input
              id={`player-${index + 1}`}
              className="control"
              value={name}
              autoComplete="off"
              aria-describedby="tournament-name-problem"
              onChange={(event) =>
                change({
                  ...state,
                  names: state.names.map((item, i) =>
                    i === index ? event.currentTarget.value : item,
                  ),
                })
              }
            />
          </div>
        ))}
      </div>
      <p id="tournament-name-problem">{problem}</p>
      <button type="submit" className="control">
        Start tournament
      </button>
    </form>
  );
}
