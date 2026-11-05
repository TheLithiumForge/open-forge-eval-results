interface Props {
  count: number;
  setCount(count: number): void;
  names: string[];
  setNames(names: string[]): void;
  notice: string;
  start(): void;
  back(): void;
}
export function TournamentSetup({ count, setCount, names, setNames, notice, start, back }: Props) {
  return (
    <section className="tournament-setup">
      <div>
        <label htmlFor="players">Players</label>{' '}
        <select
          className="control"
          id="players"
          value={count}
          onChange={(event) => setCount(Number(event.currentTarget.value))}
        >
          <option value={4}>4</option>
          <option value={8}>8</option>
        </select>
      </div>
      <div className="player-fields">
        {names.slice(0, count).map((name, index) => (
          <div key={index}>
            <label htmlFor={`player-${index}`}>Player {index + 1}</label>
            <input
              className="control"
              id={`player-${index}`}
              value={name}
              onChange={(event) => {
                const next = [...names];
                next[index] = event.currentTarget.value;
                setNames(next);
              }}
            />
          </div>
        ))}
      </div>
      {notice && <p>{notice}</p>}
      <div className="tournament-actions">
        <button className="control" onClick={start}>
          Start tournament
        </button>
        <button className="control" onClick={back}>
          Back to game
        </button>
      </div>
    </section>
  );
}
