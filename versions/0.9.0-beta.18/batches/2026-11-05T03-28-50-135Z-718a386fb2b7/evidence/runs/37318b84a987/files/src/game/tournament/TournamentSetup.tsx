interface Props {
  count: number;
  setCount(count: number): void;
  names: string[];
  setNames(names: string[]): void;
  start(): void;
  back(): void;
}
export function TournamentSetup({ count, setCount, names, setNames, start, back }: Props) {
  return (
    <>
      <label htmlFor="players">Players </label>
      <select
        id="players"
        className="control"
        value={count}
        onChange={(event) => setCount(Number(event.currentTarget.value))}
      >
        <option value={4}>4</option>
        <option value={8}>8</option>
      </select>
      <div className="player-fields">
        {names.slice(0, count).map((name, index) => (
          <label key={index}>
            Player {index + 1}
            <input
              className="control"
              value={name}
              onChange={(event) => {
                const value = event.currentTarget.value;
                setNames(names.map((n, i) => (i === index ? value : n)));
              }}
            />
          </label>
        ))}
      </div>
      <div className="tournament-actions">
        <button className="control" type="button" onClick={start}>
          Start tournament
        </button>
        <button className="control" type="button" onClick={back}>
          Back to game
        </button>
      </div>
    </>
  );
}
