import type { TournamentData } from './rules.ts';

interface Props {
  count: number;
  setCount(value: number): void;
  names: string[];
  setNames(value: string[]): void;
  start(): void;
  back(): void;
  history: { items: TournamentData[]; blocked: boolean };
  open(item: TournamentData): void;
}
export function Setup({ count, setCount, names, setNames, start, back, history, open }: Props) {
  return (
    <>
      <label>
        Players{' '}
        <select
          className="control"
          value={count}
          onChange={(e) => setCount(Number(e.currentTarget.value))}
        >
          <option value={4}>4</option>
          <option value={8}>8</option>
        </select>
      </label>
      <div className="tournament-fields">
        {names.slice(0, count).map((name, index) => (
          <label key={index}>
            Player {index + 1}
            <input
              className="control"
              value={name}
              onChange={(e) => {
                const next = e.currentTarget.value;
                setNames(names.map((value, i) => (i === index ? next : value)));
              }}
            />
          </label>
        ))}
      </div>
      <div className="tournament-actions">
        <button className="control" onClick={start}>
          Start tournament
        </button>
        <button className="control" onClick={back}>
          Back to game
        </button>
      </div>
      <h3>Past tournaments</h3>
      {history.blocked && <p>Progress won't be saved on this device.</p>}
      {history.items.length === 0 ? (
        <p>No past tournaments yet.</p>
      ) : (
        <ul>
          {history.items.map((item, index) => (
            <li key={index}>
              <button className="control" onClick={() => open(item)}>
                Champion: {item.names[item.matches[item.current]!.winner!]}
              </button>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
