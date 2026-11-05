import type { FormEvent } from 'react';
import type { PlayerCount } from './rules.ts';

export interface TournamentDraft {
  readonly playerCount: PlayerCount;
  readonly players: readonly string[];
}

interface TournamentSetupProps {
  draft: TournamentDraft;
  onChange(draft: TournamentDraft): void;
  onBack(): void;
  onStart(event: FormEvent<HTMLFormElement>): void;
}

export function TournamentSetup({ draft, onBack, onChange, onStart }: TournamentSetupProps) {
  function updateName(index: number, value: string): void {
    const players = [...draft.players];
    players[index] = value;
    onChange({ ...draft, players });
  }

  return (
    <form className="tournament-setup" onSubmit={onStart} noValidate>
      <div className="tournament-player-count">
        <label htmlFor="tournament-player-count">Players</label>
        <select
          id="tournament-player-count"
          className="control"
          value={draft.playerCount}
          onChange={(event) =>
            onChange({ ...draft, playerCount: Number(event.currentTarget.value) === 8 ? 8 : 4 })
          }
        >
          <option value="4">4</option>
          <option value="8">8</option>
        </select>
      </div>
      <div className="tournament-player-fields">
        {draft.players.slice(0, draft.playerCount).map((name, index) => (
          <div className="tournament-name-field" key={index}>
            <label htmlFor={`tournament-player-${index + 1}`}>Player {index + 1}</label>
            <input
              id={`tournament-player-${index + 1}`}
              className="control"
              value={name}
              onChange={(event) => updateName(index, event.currentTarget.value)}
              aria-describedby="tournament-announcement"
            />
          </div>
        ))}
      </div>
      <div className="tournament-actions">
        <button type="submit" className="control">
          Start tournament
        </button>
        <button type="button" className="control" onClick={onBack}>
          Back to game
        </button>
      </div>
    </form>
  );
}
