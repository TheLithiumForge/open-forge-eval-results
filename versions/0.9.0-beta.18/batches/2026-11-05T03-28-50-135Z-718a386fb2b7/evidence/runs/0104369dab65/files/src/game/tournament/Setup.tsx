import { Bracket } from './Bracket.tsx';
import type { TournamentState } from './rules.ts';

interface Props {
  count: number;
  setCount(n: number): void;
  drafts: string[];
  setDrafts(names: string[]): void;
  start(): void;
  history: { items: TournamentState[]; blocked: boolean };
  setT(t: TournamentState): void;
  clearNotice(): void;
  back(): void;
}
export function Setup({
  count,
  setCount,
  drafts,
  setDrafts,
  start,
  history,
  setT,
  clearNotice,
  back,
}: Props) {
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
        {drafts.slice(0, count).map((name, index) => (
          <div className="name-field" key={index}>
            <label htmlFor={`player-${index}`}>Player {index + 1}</label>
            <input
              className="control"
              id={`player-${index}`}
              value={name}
              onChange={(e) => {
                const next = [...drafts];
                next[index] = e.currentTarget.value;
                setDrafts(next);
              }}
            />
          </div>
        ))}
        <button className="control" type="button" onClick={start}>
          Start tournament
        </button>
      </div>
      <h3>Past tournaments</h3>
      {history.blocked && <p>Progress won't be saved on this device.</p>}
      {history.items.length === 0 ? (
        <p>No past tournaments.</p>
      ) : (
        history.items.map((item, i) => (
          <section key={i}>
            <p>Champion: {item.names[item.matches.at(-1)!.winner!]}</p>
            <Bracket t={item} />
            <button
              className="control"
              type="button"
              onClick={() => {
                setT(item);
                clearNotice();
              }}
            >
              View tournament
            </button>
          </section>
        ))
      )}
      <button className="control" type="button" onClick={back}>
        Back to game
      </button>
    </>
  );
}
