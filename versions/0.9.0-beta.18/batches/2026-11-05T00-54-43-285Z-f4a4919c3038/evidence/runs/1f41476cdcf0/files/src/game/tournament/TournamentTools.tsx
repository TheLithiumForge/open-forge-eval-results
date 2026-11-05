import { TOURNAMENT_MAX_BYTES } from './format.ts';
import { matchWinner } from './rules.ts';
import type { TournamentController } from '../session/use-tournament.ts';

interface TournamentToolsProps {
  controller: TournamentController;
  replace(action: () => void): void;
}

export function TournamentTools({ controller, replace }: TournamentToolsProps) {
  return (
    <>
      {controller.tournament && controller.history.blocked && (
        <p>Progress won't be saved on this device.</p>
      )}
      {!controller.tournament && (
        <section className="tournament-history">
          <h3>Past tournaments</h3>
          {controller.history.blocked && <p>Progress won't be saved on this device.</p>}
          {controller.history.items.length === 0 ? (
            <p>No finished tournaments yet.</p>
          ) : (
            <ul>
              {controller.history.items.map((item, index) => (
                <li key={index}>
                  <button
                    type="button"
                    className="control"
                    onClick={() => controller.viewPast(item)}
                  >
                    {item.players.length} players · Champion:{' '}
                    {item.players[matchWinner(item, item.matchIndex) ?? 0]} ·{' '}
                    {item.players.join(', ')}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
      <section className="tournament-exchange" aria-label="Tournament sharing">
        <div className="tournament-actions">
          <button className="control" type="button" onClick={controller.exportJson}>
            Export tournament
          </button>
          <button
            className="control"
            type="button"
            onClick={() => controller.load(replace)}
            aria-describedby="tournament-notice"
          >
            Load tournament
          </button>
        </div>
        <label htmlFor="tournament-json">Tournament JSON</label>
        <textarea
          id="tournament-json"
          className="control"
          rows={8}
          maxLength={TOURNAMENT_MAX_BYTES}
          value={controller.json}
          onChange={(event) => controller.setJson(event.currentTarget.value)}
          spellCheck={false}
        />
        <p id="tournament-notice">{controller.notice}</p>
      </section>
    </>
  );
}
