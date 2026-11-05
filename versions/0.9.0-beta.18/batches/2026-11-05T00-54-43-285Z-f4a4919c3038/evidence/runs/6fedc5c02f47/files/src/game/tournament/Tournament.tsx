import { useEffect, useRef, useState } from 'react';
import { formatElapsed } from '../elapsed-time.ts';
import { tournamentBracket } from './bracket.ts';
import { PastTournaments } from './PastTournaments.tsx';
import { TournamentBracket } from './TournamentBracket.tsx';
import { TournamentSetup } from './TournamentSetup.tsx';
import { TournamentTurn } from './TournamentTurn.tsx';
import { useTournament } from './use-tournament.ts';
import type { TournamentTurnHandle } from './TournamentTurn.tsx';
import './tournament.css';

interface TournamentProps {
  size: number;
  leave(): void;
}

export function Tournament({ size, leave }: TournamentProps) {
  const controller = useTournament(size);
  const { active, past } = controller.workspace;
  const [json, setJson] = useState('');
  const turn = useRef<TournamentTurnHandle>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const step = useRef<HTMLButtonElement>(null);
  const match = active?.tournament.matches[active.matchIndex];
  const bracket = active ? tournamentBracket(active.tournament) : [];
  const currentMatch = active ? bracket[active.matchIndex] : undefined;
  const completed = active?.phase === 'complete';
  const playerTurn =
    active?.phase === 'turn-complete' ? 0 : Math.min(match?.results.length ?? 0, 1);
  const playerIndex = currentMatch?.players[playerTurn];
  const name =
    playerIndex !== null && playerIndex !== undefined
      ? active?.tournament.players[playerIndex]
      : '';
  const championIndex = bracket.at(-1)?.winner;
  const champion =
    championIndex !== null && championIndex !== undefined
      ? active?.tournament.players[championIndex]
      : '';
  const result = match?.results[playerTurn];
  useEffect(() => heading.current?.focus(), []);
  useEffect(() => {
    step.current?.focus();
  }, [active?.phase, active?.matchIndex, active?.tournament.id]);

  return (
    <section className="tournament" aria-labelledby="tournament-title">
      <h2 id="tournament-title" tabIndex={-1} ref={heading}>
        Tournament
      </h2>
      <div className="control-row tournament-navigation">
        <button
          type="button"
          className="control"
          onClick={leave}
          ref={completed ? step : undefined}
          aria-describedby={completed ? 'tournament-champion' : undefined}
        >
          {active && !completed ? 'Leave tournament' : 'Back to game'}
        </button>
        {completed && (
          <button type="button" className="control" onClick={controller.setup}>
            Tournament setup
          </button>
        )}
      </div>
      {!active && <TournamentSetup size={size} start={controller.start} />}
      {active && (
        <>
          {completed ? (
            <h3
              id="tournament-champion"
              className="tournament-champion"
              role="status"
              aria-live="polite"
            >
              Champion: {champion}
            </h3>
          ) : (
            <div className="tournament-handoff">
              <h3>
                Match {active.matchIndex + 1} of {active.tournament.matches.length}
              </h3>
              {active.phase !== 'match-complete' && (
                <p id="tournament-current-player" className="now-playing">
                  Now playing: {name}
                </p>
              )}
              {active.phase === 'ready' && (
                <>
                  <p>Pass the device to {name}. Select Start turn when ready.</p>
                  <button
                    type="button"
                    className="control"
                    ref={step}
                    aria-describedby="tournament-current-player"
                    onClick={controller.startTurn}
                  >
                    Start turn
                  </button>
                </>
              )}
              {active.phase === 'turn-complete' && (
                <>
                  <p id="tournament-turn-result">
                    {name} finished in {result?.moves} moves and{' '}
                    {formatElapsed(result?.elapsedMs ?? 0)}.
                  </p>
                  <button
                    type="button"
                    className="control"
                    ref={step}
                    onClick={controller.advance}
                    aria-describedby="tournament-turn-result"
                  >
                    Next turn
                  </button>
                </>
              )}
              {active.phase === 'match-complete' && (
                <>
                  <p id="tournament-match-result">
                    {currentMatch?.winner !== null && currentMatch?.winner !== undefined
                      ? `Winner: ${active.tournament.players[currentMatch.winner]}`
                      : 'Tie. Replay this match on a new deal.'}
                  </p>
                  <button
                    type="button"
                    className="control"
                    ref={step}
                    onClick={controller.advance}
                    aria-describedby="tournament-match-result"
                  >
                    Next match
                  </button>
                </>
              )}
            </div>
          )}
          {active.phase === 'playing' && active.game && (
            <TournamentTurn
              key={`${active.tournament.id}-${active.matchIndex}-${match?.results.length}`}
              ref={turn}
              game={active.game}
              finish={controller.finishTurn}
            />
          )}
          <TournamentBracket
            tournament={active.tournament}
            currentMatch={completed ? -1 : active.matchIndex}
          />
        </>
      )}
      {!active && <PastTournaments records={past} view={controller.view} />}
      <section className="tournament-json" aria-label="Tournament transfer">
        <label htmlFor="tournament-json">Tournament JSON</label>
        <textarea
          id="tournament-json"
          className="control"
          rows={6}
          value={json}
          spellCheck={false}
          onChange={(event) => setJson(event.currentTarget.value)}
        />
        <div className="control-row">
          <button
            type="button"
            className="control"
            onClick={() => setJson(controller.exportTournament(turn.current?.exportGame() ?? null))}
          >
            Export tournament
          </button>
          <button type="button" className="control" onClick={() => controller.loadTournament(json)}>
            Load tournament
          </button>
        </div>
        <p role="status" aria-live="polite" aria-atomic="true">
          {controller.notice}
        </p>
      </section>
    </section>
  );
}
