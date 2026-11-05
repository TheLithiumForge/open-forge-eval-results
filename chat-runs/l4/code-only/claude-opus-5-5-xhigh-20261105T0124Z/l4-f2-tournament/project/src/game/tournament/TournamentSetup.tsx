import { NAME_MAX_CHARACTERS, PLAYER_COUNTS } from './bracket.ts';
import { PastTournaments } from './PastTournaments.tsx';
import { dealNotice, playerLabel, TournamentControl } from './tournament-labels.ts';
import type { Tournament } from './bracket.ts';
import type { TournamentFlow } from './tournament-flow.ts';
import '../controls/control.css';

interface TournamentSetupProps {
  flow: TournamentFlow;
  size: number;
  past: readonly Tournament[];
  chooseCount(count: number): void;
  editName(index: number, name: string): void;
  start(): number | null;
  leave(): void;
}

function nameField(index: number): string {
  return `player-${index + 1}`;
}

export function TournamentSetup({
  flow,
  size,
  past,
  chooseCount,
  editName,
  start,
  leave,
}: TournamentSetupProps) {
  return (
    <>
      <form
        className="tournament-setup"
        onSubmit={(event) => {
          event.preventDefault();
          const problem = start();
          // A missing or repeated name keeps focus where it needs correcting.
          const field =
            problem === null ? null : event.currentTarget.elements.namedItem(nameField(problem));
          if (field instanceof HTMLInputElement) field.focus();
        }}
      >
        <div className="tournament-field">
          <label htmlFor="tournament-players">{TournamentControl.players}</label>
          <select
            id="tournament-players"
            className="control"
            value={flow.count}
            onChange={(event) => chooseCount(Number(event.currentTarget.value))}
          >
            {PLAYER_COUNTS.map((count) => (
              <option key={count} value={count}>
                {count}
              </option>
            ))}
          </select>
        </div>
        <fieldset className="tournament-names">
          <legend>{TournamentControl.names}</legend>
          {flow.draft.slice(0, flow.count).map((name, index) => (
            <div key={index} className="tournament-field">
              <label htmlFor={nameField(index)}>{playerLabel(index)}</label>
              <input
                id={nameField(index)}
                name={nameField(index)}
                className="control"
                value={name}
                maxLength={NAME_MAX_CHARACTERS}
                autoComplete="off"
                spellCheck={false}
                onChange={(event) => editName(index, event.currentTarget.value)}
              />
            </div>
          ))}
        </fieldset>
        <p className="help">{dealNotice(size)}</p>
        <div className="tournament-actions">
          <button type="submit" className="control" aria-describedby="tournament-notice">
            {TournamentControl.start}
          </button>
          <button type="button" className="control" onClick={leave}>
            {TournamentControl.back}
          </button>
        </div>
      </form>
      <PastTournaments past={past} />
    </>
  );
}
