import { useRef } from 'react';
import { Bracket } from './Bracket.tsx';
import { TournamentJson } from './TournamentJson.tsx';
import { TournamentSetup } from './TournamentSetup.tsx';
import { TournamentTurn } from './TournamentTurn.tsx';
import { tournamentBracket } from './tournament.ts';
import { useTournament } from './use-tournament.ts';
import type { TournamentTurnHandle } from './TournamentTurn.tsx';
import type { Tournament } from './tournament.ts';
import '../controls/control.css';
import '../controls/controls.css';
import '../controls/reproduction.css';
import './tournament.css';

function champion(tournament: Tournament): string {
  const winner = tournamentBracket(tournament).at(-1)?.winner;
  return winner === null || winner === undefined ? '' : (tournament.players[winner] ?? '');
}

interface TournamentScreenProps {
  size: number;
  exit(): void;
}

export function TournamentScreen({ size, exit }: TournamentScreenProps) {
  const controller = useTournament(size);
  const { setup, tournament, pastTournaments } = controller.document;
  const turn = useRef<TournamentTurnHandle>(null);
  const active = tournament?.stage === 'ready' || tournament?.stage === 'playing';
  const match = tournament
    ? tournamentBracket(tournament)[Math.floor(tournament.results.length / 2)]
    : undefined;
  const player = tournament && match ? match.players[tournament.results.length % 2] : null;
  return (
    <main className="tournament-screen">
      <header>
        <p className="eyebrow">Neon Pairs · Share a device</p>
        <h1>Tournament</h1>
      </header>
      <p className="intro">
        A knockout for 4 or 8 players. Both players play the same deal, one after the other. Fewer
        moves wins. Tied moves use the faster time; an exact tie goes to the first player listed.
      </p>
      {!tournament ? (
        <>
          <TournamentSetup setup={setup} change={controller.setup} start={controller.start} />
          <button type="button" className="control" onClick={exit}>
            Back to game
          </button>
          <section className="past-tournaments" aria-label="Past tournaments">
            <h2>Past tournaments</h2>
            {pastTournaments.length === 0 ? (
              <p>No finished tournaments yet.</p>
            ) : (
              <ol>
                {pastTournaments.map((past, index) => (
                  <li key={past.id}>
                    <button
                      type="button"
                      className="control"
                      onClick={() => controller.update(past)}
                    >
                      Tournament {pastTournaments.length - index} · {past.players.length} players ·
                      Champion: {champion(past)}
                    </button>
                  </li>
                ))}
              </ol>
            )}
          </section>
        </>
      ) : (
        <>
          <div className="tournament-progress" aria-live="polite" aria-atomic="true">
            {active && (
              <h2>
                Now playing:{' '}
                {player === null || player === undefined ? '' : tournament.players[player]}
              </h2>
            )}
            {tournament.stage === 'turn-complete' && <h2>Turn complete</h2>}
            {tournament.stage === 'match-complete' && <h2>Match complete</h2>}
            {tournament.stage === 'complete' && <h2>Champion: {champion(tournament)}</h2>}
          </div>
          <div className="tournament-actions">
            {tournament.stage === 'ready' && (
              <button type="button" className="control" autoFocus onClick={controller.startTurn}>
                Start turn
              </button>
            )}
            {tournament.stage === 'turn-complete' && (
              <button type="button" className="control" autoFocus onClick={controller.next}>
                Next turn
              </button>
            )}
            {tournament.stage === 'match-complete' && (
              <button type="button" className="control" autoFocus onClick={controller.next}>
                Next match
              </button>
            )}
            <button type="button" className="control" onClick={exit}>
              {tournament.stage === 'complete' ? 'Back to game' : 'Leave tournament'}
            </button>
          </div>
          {tournament.stage === 'playing' && tournament.game && (
            <TournamentTurn
              key={`${controller.revision}-${tournament.id}-${tournament.results.length}`}
              game={tournament.game}
              paused={controller.imported}
              finish={controller.finish}
              ref={turn}
            />
          )}
          <Bracket tournament={tournament} />
        </>
      )}
      <TournamentJson
        exportTournament={() => controller.exportTournament(turn.current?.game())}
        load={controller.load}
      />
    </main>
  );
}
