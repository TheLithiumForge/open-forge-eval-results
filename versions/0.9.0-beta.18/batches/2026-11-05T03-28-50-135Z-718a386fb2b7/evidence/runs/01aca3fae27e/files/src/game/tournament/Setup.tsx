import type { Tournament } from './model.ts';
export function Setup({
  count,
  setCount,
  names,
  setNames,
  start,
  blocked,
  history,
  open,
}: {
  count: number;
  setCount(n: number): void;
  names: string[];
  setNames(names: string[]): void;
  start(): void;
  blocked: boolean;
  history: Tournament[];
  open(t: Tournament): void;
}) {
  return (
    <>
      <div className="tournament-form">
        <label htmlFor="players">Players</label>
        <select
          className="control"
          id="players"
          value={count}
          onChange={(e) => setCount(Number(e.currentTarget.value))}
        >
          <option value={4}>4</option>
          <option value={8}>8</option>
        </select>
        {names.slice(0, count).map((name, i) => (
          <div className="name-field" key={i}>
            <label htmlFor={`player-${i}`}>Player {i + 1}</label>
            <input
              className="control"
              id={`player-${i}`}
              value={name}
              onChange={(e) => {
                const next = [...names];
                next[i] = e.currentTarget.value;
                setNames(next);
              }}
            />
          </div>
        ))}
        <button className="control" type="button" onClick={start}>
          Start tournament
        </button>
      </div>
      <h3>Past tournaments</h3>
      {blocked && <p>Progress won't be saved on this device.</p>}
      {history.length === 0 ? (
        <p>No past tournaments yet.</p>
      ) : (
        <ul>
          {history.map((t, i) => (
            <li key={i}>
              <button
                className="control"
                type="button"
                onClick={() => {
                  open(t);
                }}
              >
                Champion: {t.names[t.matches[t.index]!.winner!]}
              </button>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
