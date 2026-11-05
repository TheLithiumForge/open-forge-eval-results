import { useTournament } from './use-tournament.ts';

interface TournamentControllerProps {
  controller: ReturnType<typeof useTournament>;
}

export function TournamentSetup({ controller }: TournamentControllerProps) {
  return (
    <div className="tournament-setup">
      <div className="player-count">
        <label htmlFor="tournament-player-count">Players</label>
        <select
          id="tournament-player-count"
          className="control"
          value={controller.draft.playerCount}
          onChange={(event) =>
            controller.setPlayerCount(Number(event.currentTarget.value) === 8 ? 8 : 4)
          }
        >
          <option value={4}>4</option>
          <option value={8}>8</option>
        </select>
      </div>
      <div className="player-names">
        {controller.draft.names.map((name, index) => (
          <label key={index} htmlFor={`tournament-player-${index + 1}`}>
            Player {index + 1}
            <input
              id={`tournament-player-${index + 1}`}
              className="control"
              value={name}
              maxLength={60}
              onChange={(event) => controller.setName(index, event.currentTarget.value)}
            />
          </label>
        ))}
      </div>
      <button type="button" className="control" onClick={controller.start}>
        Start tournament
      </button>
    </div>
  );
}

export function TournamentJson({ controller }: TournamentControllerProps) {
  return (
    <section className="tournament-json" aria-labelledby="tournament-json-title">
      <h2 id="tournament-json-title">Share or load a tournament</h2>
      <label htmlFor="tournament-json-box">Tournament JSON</label>
      <textarea
        id="tournament-json-box"
        className="control"
        rows={8}
        maxLength={200_000}
        spellCheck={false}
        value={controller.json}
        onChange={(event) => controller.setJson(event.currentTarget.value)}
      />
      <div className="tournament-actions">
        <button type="button" className="control" onClick={controller.exportTournament}>
          Export tournament
        </button>
        <button type="button" className="control" onClick={controller.loadTournament}>
          Load tournament
        </button>
      </div>
    </section>
  );
}
