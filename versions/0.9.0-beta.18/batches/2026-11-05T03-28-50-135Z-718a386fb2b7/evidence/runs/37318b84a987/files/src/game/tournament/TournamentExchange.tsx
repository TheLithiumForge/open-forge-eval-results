import { Bracket } from './Bracket.tsx';
import { exportTournament } from './format.ts';
import type { Tournament } from './rules.ts';
interface Props {
  json: string;
  setJson(value: string): void;
  exportCurrent(): void;
  load(): void;
  history: { items: Tournament[]; blocked: boolean };
  publish(text: string): void;
}
export function TournamentExchange({
  json,
  setJson,
  exportCurrent,
  load,
  history,
  publish,
}: Props) {
  return (
    <>
      <section className="tournament-json">
        <h3>Tournament JSON</h3>
        <label htmlFor="tournament-json">Tournament JSON</label>
        <textarea
          id="tournament-json"
          className="control"
          value={json}
          onChange={(event) => setJson(event.currentTarget.value)}
        />
        <div className="tournament-actions">
          <button className="control" type="button" onClick={exportCurrent}>
            Export tournament
          </button>
          <button className="control" type="button" onClick={load}>
            Load tournament
          </button>
        </div>
      </section>
      <section>
        <h3>Past tournaments</h3>
        {history.blocked && <p>Progress won't be saved on this device.</p>}
        {history.items.length === 0 ? (
          <p>No past tournaments yet.</p>
        ) : (
          history.items.map((item, i) => (
            <details key={i}>
              <summary>Champion: {item.names[item.matches.at(-1)![0]!.winner! - 1]}</summary>
              <Bracket tournament={item} />
              <button
                className="control"
                type="button"
                onClick={() => {
                  setJson(exportTournament(item));
                  publish('Tournament exported.');
                }}
              >
                Export tournament
              </button>
            </details>
          ))
        )}
      </section>
    </>
  );
}
