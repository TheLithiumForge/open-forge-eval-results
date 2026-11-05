import { PLAYER_COUNTS } from './rules.ts';
import { TournamentControl } from './tournament-labels.ts';

interface TournamentSetupProps {
  count: number;
  drafts: readonly string[];
  setCount(count: number): void;
  setDraft(index: number, draft: string): void;
  start(): void;
  back(): void;
}

// Entry order sets the seeds. Names are checked when the tournament starts, not while typing.
export function TournamentSetup({
  count,
  drafts,
  setCount,
  setDraft,
  start,
  back,
}: TournamentSetupProps) {
  return (
    <form
      className="tournament-setup"
      onSubmit={(event) => {
        event.preventDefault();
        start();
      }}
    >
      <p className="tournament-intro">
        Four or eight players take turns on this device. Both players in a match get the same deal,
        one after the other, and fewer moves wins. Equal moves go to the faster time, then to the
        player entered first. Tournament games don't change your saved size or Best.
      </p>
      <div className="tournament-field">
        <label htmlFor="player-count">{TournamentControl.players}</label>
        <select
          id="player-count"
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
      <div className="player-names">
        {drafts.slice(0, count).map((draft, index) => (
          <div key={index} className="player-name">
            <label htmlFor={`player-${index + 1}`}>
              {TournamentControl.player} {index + 1}
            </label>
            <input
              id={`player-${index + 1}`}
              className="control"
              value={draft}
              autoComplete="off"
              spellCheck={false}
              onChange={(event) => setDraft(index, event.currentTarget.value)}
            />
          </div>
        ))}
      </div>
      <div className="tournament-actions">
        <button type="submit" className="control">
          {TournamentControl.start}
        </button>
        <button type="button" className="control" onClick={back}>
          {TournamentControl.back}
        </button>
      </div>
    </form>
  );
}
