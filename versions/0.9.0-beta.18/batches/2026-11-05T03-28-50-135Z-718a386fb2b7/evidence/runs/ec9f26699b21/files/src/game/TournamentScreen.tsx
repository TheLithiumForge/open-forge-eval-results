import { useEffect, useRef, useState } from 'react';
import { formatElapsed } from './elapsed-time.ts';
import { Board } from './board/Board.tsx';
import type { BoardFocus } from './board/Board.tsx';
import { GameStatus } from './status/GameStatus.tsx';
import type { Session } from './session/session.ts';
import {
  activeTournamentMatch,
  decodeTournamentSetup,
  encodeTournamentSetup,
  matchPlaceholder,
  nextPlayerName,
  validateNames,
} from './tournament.ts';
import type { Tournament } from './tournament.ts';
import './tournament.css';

const JSON_MAX_CHARACTERS = 100_000;

interface TournamentScreenProps {
  session: Session;
  active: Tournament | null;
  championView: Tournament | null;
  past: readonly Tournament[];
  startTournament(playerCount: 4 | 8, names: readonly string[]): void;
  startTurn(): void;
  nextTurn(): void;
  nextMatch(): void;
  leaveTournament(): void;
  backToGame(): void;
  setupAnother(): void;
  exportTournament(tournament: Tournament): string;
  loadTournament(text: string): boolean;
  activate(index: number): void;
}

export function TournamentScreen({
  session,
  active,
  championView,
  past,
  startTournament,
  startTurn,
  nextTurn,
  nextMatch,
  leaveTournament,
  backToGame,
  setupAnother,
  exportTournament,
  loadTournament,
  activate,
}: TournamentScreenProps) {
  const [playerCount, setPlayerCount] = useState<4 | 8>(4);
  const [names, setNames] = useState(() =>
    Array.from({ length: 8 }, (_, index) => `Player ${index + 1}`),
  );
  const [nameError, setNameError] = useState('');
  const [json, setJson] = useState('');
  const [jsonNotice, setJsonNotice] = useState('');
  const board = useRef<BoardFocus>(null);
  const game = session.game;
  const isActive = active?.phase === 'active';
  const currentMatch = active ? activeTournamentMatch(active) : null;
  const player = active ? nextPlayerName(active) : null;
  const selectedTournament = active ?? championView ?? past[0] ?? null;

  useEffect(() => {
    if (isActive && active?.turnState === 'playing') board.current?.focusRemembered();
  }, [active?.turnState, session.generation, isActive]);

  function updateName(index: number, value: string): void {
    setNames((previous) => previous.map((name, nameIndex) => (nameIndex === index ? value : name)));
    setNameError('');
  }

  function beginTournament(): void {
    if (!validateNames(names, playerCount)) {
      setNameError('Enter a unique name for each player in this tournament.');
      return;
    }
    startTournament(playerCount, names);
  }

  function exportSelected(): void {
    if (!selectedTournament) {
      setJson(encodeTournamentSetup(playerCount, names));
      setJsonNotice('Tournament setup JSON is ready.');
      return;
    }
    setJson(exportTournament(selectedTournament));
    setJsonNotice('Tournament JSON is ready.');
  }

  function loadFromBox(): void {
    const setup = decodeTournamentSetup(json);
    if (setup) {
      setPlayerCount(setup.playerCount);
      setNames([...setup.names]);
      setNameError('');
      setJsonNotice('Tournament setup loaded.');
      return;
    }
    setJsonNotice(loadTournament(json) ? 'Tournament loaded.' : 'Invalid tournament JSON.');
  }

  return (
    <section className="tournament-screen" aria-labelledby="tournament-title">
      <div className="tournament-heading">
        <div>
          <p className="eyebrow">One deal. Two turns. One champion.</p>
          <h2 id="tournament-title">Tournament</h2>
        </div>
        {!isActive && !championView && (
          <button type="button" className="control" onClick={backToGame}>
            Back to game
          </button>
        )}
      </div>

      {!isActive && !championView && (
        <section className="tournament-setup" aria-labelledby="setup-title">
          <h3 id="setup-title">Set up a knockout tournament</h3>
          <div className="tournament-players-control">
            <label htmlFor="tournament-player-count">Players</label>
            <select
              id="tournament-player-count"
              className="control"
              value={playerCount}
              onChange={(event) => setPlayerCount(Number(event.currentTarget.value) as 4 | 8)}
            >
              <option value={4}>4</option>
              <option value={8}>8</option>
            </select>
          </div>
          <div className="player-name-grid">
            {names.map((name, index) => (
              <label key={index} htmlFor={`tournament-player-${index + 1}`}>
                Player {index + 1}
                <input
                  id={`tournament-player-${index + 1}`}
                  className="control"
                  value={name}
                  maxLength={40}
                  autoComplete="off"
                  onChange={(event) => updateName(index, event.currentTarget.value)}
                />
              </label>
            ))}
          </div>
          <p className="tournament-error" role="status" aria-live="polite">
            {nameError}
          </p>
          <button type="button" className="control primary-control" onClick={beginTournament}>
            Start tournament
          </button>
        </section>
      )}

      {isActive && active && currentMatch && (
        <section className="active-tournament" aria-labelledby="active-tournament-title">
          <div className="active-tournament-heading">
            <div>
              <h3 id="active-tournament-title">
                Round {currentMatch.round}, match {currentMatch.number}
              </h3>
              <p className="now-playing" aria-live="polite" aria-atomic="true">
                Now playing: {player}
              </p>
            </div>
            <button type="button" className="control leave-control" onClick={leaveTournament}>
              Leave tournament
            </button>
          </div>
          <GameStatus
            game={game}
            best={session.preferences.bestMoves[String(game.size)]}
            celebration={session.celebration}
          />
          <p id="board-help" className="help">
            Use a pointer or Tab to enter the board. Arrow keys move between cards. Enter or Space
            reveals a card.
          </p>
          <div className="game-result">
            <p role="status" aria-live="polite" aria-atomic="true">
              <span key={session.announcement}>{session.feedback}</span>
            </p>
          </div>
          <Board
            key={session.generation}
            game={game}
            activate={(index) => {
              if (active.turnState === 'playing') activate(index);
            }}
            ref={board}
          />
          <div className="tournament-actions" aria-live="polite">
            {active.turnState === 'ready' && (
              <button type="button" className="control primary-control" onClick={startTurn}>
                Start turn
              </button>
            )}
            {active.turnState === 'turn-over' && (
              <button type="button" className="control primary-control" onClick={nextTurn}>
                Next turn
              </button>
            )}
            {active.turnState === 'match-over' && (
              <button type="button" className="control primary-control" onClick={nextMatch}>
                Next match
              </button>
            )}
          </div>
        </section>
      )}

      {championView?.phase === 'complete' && (
        <section className="champion-panel" aria-labelledby="champion-title">
          <h3 id="champion-title">Champion: {championView.champion}</h3>
          <p>The tournament is complete.</p>
          <div className="tournament-actions">
            <button type="button" className="control" onClick={backToGame}>
              Back to game
            </button>
            <button type="button" className="control" onClick={setupAnother}>
              Set up another tournament
            </button>
          </div>
        </section>
      )}

      {(active || championView) && (
        <TournamentBracket tournament={active ?? championView!} title="Tournament bracket" />
      )}

      <section className="tournament-json" aria-labelledby="tournament-json-title">
        <h3 id="tournament-json-title">Tournament JSON</h3>
        <label htmlFor="tournament-json">Tournament JSON</label>
        <textarea
          id="tournament-json"
          className="control"
          rows={8}
          maxLength={JSON_MAX_CHARACTERS}
          spellCheck={false}
          value={json}
          onChange={(event) => setJson(event.currentTarget.value)}
        />
        <div className="tournament-actions">
          <button type="button" className="control" onClick={exportSelected}>
            Export tournament
          </button>
          <button type="button" className="control" onClick={loadFromBox}>
            Load tournament
          </button>
        </div>
        <p className="tournament-json-notice" role="status" aria-live="polite">
          {jsonNotice}
        </p>
      </section>

      <section className="past-tournaments" aria-labelledby="past-tournaments-title">
        <h3 id="past-tournaments-title">Past tournaments</h3>
        {past.length === 0 ? (
          <p className="empty-tournaments">Completed tournaments will appear here.</p>
        ) : (
          <div className="past-tournament-list">
            {past.map((tournament, index) => (
              <details className="past-tournament" key={`${tournament.createdAt}-${index}`}>
                <summary>
                  {new Date(tournament.createdAt).toLocaleString()} · {tournament.playerCount}{' '}
                  players · Champion: {tournament.champion}
                </summary>
                <TournamentBracket tournament={tournament} title="Tournament bracket" />
              </details>
            ))}
          </div>
        )}
      </section>
    </section>
  );
}

function TournamentBracket({ tournament, title }: { tournament: Tournament; title: string }) {
  const roundCount = Math.log2(tournament.playerCount);
  return (
    <section className="tournament-bracket" aria-label={title}>
      <div className={`bracket-rounds rounds-${roundCount}`}>
        {Array.from({ length: roundCount }, (_, index) => index + 1).map((round) => (
          <div className="bracket-round" key={round}>
            <h4>{roundName(round, roundCount)}</h4>
            {tournament.matches
              .filter((match) => match.round === round)
              .map((match) => (
                <article className={`bracket-match ${match.status}`} key={match.id}>
                  <h5>
                    Match {match.round}.{match.number}
                  </h5>
                  <ol>
                    {([0, 1] as const).map((slot) => {
                      const result = match.results[slot];
                      return (
                        <li
                          key={slot}
                          className={match.winner === match.players[slot] ? 'match-winner' : ''}
                        >
                          <span className="bracket-player">{matchPlaceholder(match, slot)}</span>
                          {result && (
                            <span className="bracket-result">
                              {result.moves} moves · {formatElapsed(result.elapsedMs)}
                            </span>
                          )}
                        </li>
                      );
                    })}
                  </ol>
                  {match.winner ? (
                    <p className="match-winner-label">Winner: {match.winner}</p>
                  ) : (
                    <p className="match-status-label">
                      {match.status === 'active' ? 'In progress' : 'Upcoming'}
                    </p>
                  )}
                </article>
              ))}
          </div>
        ))}
      </div>
      {tournament.phase === 'complete' && (
        <p className="bracket-champion">Champion: {tournament.champion}</p>
      )}
    </section>
  );
}

function roundName(round: number, rounds: number): string {
  if (round === rounds) return 'Final';
  if (round === rounds - 1) return 'Semi-finals';
  if (round === 1) return 'Round 1';
  return `Round ${round}`;
}
