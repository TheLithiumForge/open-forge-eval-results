import { currentMatch } from './rules.ts';
import type { useTournament } from './use-tournament.ts';

type Props = Pick<
  ReturnType<typeof useTournament>,
  'count' | 'setCount' | 'names' | 'setNames' | 'start' | 'history' | 'setEvent' | 'announce'
> & { back(): void };
export function Setup({
  count,
  setCount,
  names,
  setNames,
  start,
  history,
  setEvent,
  announce,
  back,
}: Props) {
  return (
    <>
      <div className="tournament-form">
        <label htmlFor="players">Players</label>
        <select
          id="players"
          className="control"
          value={count}
          onChange={(e) => setCount(Number(e.target.value))}
        >
          <option value={4}>4</option>
          <option value={8}>8</option>
        </select>
        {names.slice(0, count).map((name, i) => (
          <label key={i}>
            Player {i + 1}
            <input
              className="control"
              value={name}
              onChange={(e) => setNames((old) => old.map((n, j) => (i === j ? e.target.value : n)))}
            />
          </label>
        ))}
        <button className="control" onClick={start}>
          Start tournament
        </button>
      </div>
      <h3>Past tournaments</h3>
      {history.blocked && <p>Progress won't be saved on this device.</p>}
      {history.items.length === 0 ? (
        <p>No past tournaments.</p>
      ) : (
        <ul>
          {history.items.map((past, i) => (
            <li key={i}>
              <button
                className="control"
                onClick={() => {
                  setEvent(past);
                  announce('Tournament loaded.');
                }}
              >
                Champion: {past.names[currentMatch(past).winner!]}
              </button>
            </li>
          ))}
        </ul>
      )}
      <button className="control" onClick={back}>
        Back to game
      </button>
    </>
  );
}
