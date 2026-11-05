import { NAME_MAX_CHARACTERS } from './players.ts';
import { playerLabel, TournamentControl, TournamentText } from './tournament-labels.ts';
import { PLAYER_COUNTS } from './tournament.ts';
import type { useSetupDraft } from './use-setup-draft.ts';
import '../controls/control.css';
import './tournament.css';

interface SetupFormProps {
  draft: ReturnType<typeof useSetupDraft>;
  size: number;
  start(): void;
  back(): void;
}

export function SetupForm({ draft, size, start, back }: SetupFormProps) {
  return (
    <form
      className="tournament-setup"
      onSubmit={(event) => {
        event.preventDefault();
        start();
      }}
    >
      <div className="field">
        <label htmlFor="tournament-players">{TournamentControl.players}</label>
        <select
          id="tournament-players"
          className="control"
          value={draft.count}
          onChange={(event) => draft.setCount(Number(event.currentTarget.value))}
        >
          {PLAYER_COUNTS.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </div>
      <fieldset>
        <legend>Player names</legend>
        {Array.from({ length: draft.count }, (_, position) => (
          <div className="field" key={position}>
            <label htmlFor={`tournament-player-${position + 1}`}>{playerLabel(position + 1)}</label>
            <input
              id={`tournament-player-${position + 1}`}
              className="control"
              value={draft.entries[position] ?? ''}
              placeholder={playerLabel(position + 1)}
              maxLength={NAME_MAX_CHARACTERS}
              autoComplete="off"
              spellCheck={false}
              onChange={(event) => draft.setEntry(position, event.currentTarget.value)}
            />
          </div>
        ))}
      </fieldset>
      <p className="note">
        {TournamentText.rules} Deals use the {size}x{size} grid.
      </p>
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
