import { TOURNAMENT_PLAYER_COUNTS, type TournamentDraft } from './tournament.ts';

interface TournamentSetupProps {
  readonly draft: TournamentDraft;
  readonly onBack: () => void;
  readonly onDraftChange: (draft: TournamentDraft) => void;
  readonly onStart: () => void;
}

export function TournamentSetup({ draft, onBack, onDraftChange, onStart }: TournamentSetupProps) {
  function changePlayer(index: number, value: string): void {
    const players = [...draft.players];
    players[index] = value;
    onDraftChange({ ...draft, players });
  }

  return (
    <section className="tournament-setup" aria-labelledby="tournament-setup-title">
      <h3 id="tournament-setup-title">Set up a tournament</h3>
      <form onSubmit={(event) => { event.preventDefault(); onStart(); }}>
        <div className="tournament-player-count">
          <label htmlFor="tournament-player-count">Players</label>
          <select
            id="tournament-player-count"
            className="control"
            value={draft.playerCount}
            onChange={(event) =>
              onDraftChange({ ...draft, playerCount: Number(event.currentTarget.value) as 4 | 8 })
            }
          >
            {TOURNAMENT_PLAYER_COUNTS.map((count) => (
              <option key={count} value={count}>{count}</option>
            ))}
          </select>
        </div>
        <fieldset className="tournament-name-fields">
          <legend>Player names</legend>
          {draft.players.slice(0, draft.playerCount).map((player, index) => (
            <div className="tournament-name-field" key={index}>
              <label htmlFor={`tournament-player-${index + 1}`}>Player {index + 1}</label>
              <input
                id={`tournament-player-${index + 1}`}
                className="control"
                type="text"
                autoComplete="off"
                value={player}
                onChange={(event) => changePlayer(index, event.currentTarget.value)}
              />
            </div>
          ))}
        </fieldset>
        <div className="tournament-actions">
          <button className="control" type="submit">Start tournament</button>
          <button className="control" type="button" onClick={onBack}>Back to game</button>
        </div>
      </form>
    </section>
  );
}
