import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { isWon } from './game.ts';
import type { GameState } from './game.ts';
import { parseBoardCode } from './deck.ts';
import { Board } from './board/Board.tsx';
import type { BoardFocus } from './board/Board.tsx';
import { TournamentControl } from './controls/control-labels.ts';
import { decodeSnapshot } from './snapshot.ts';
import { formatElapsed } from './elapsed-time.ts';
import { freshBoardCode } from './session/fresh-board.ts';
import { readPastTournaments, writePastTournaments } from './tournament-storage.ts';
import {
  TOURNAMENT_FILE_MAX_BYTES,
  TOURNAMENT_NAME_MAX_LENGTH,
  TOURNAMENT_VERSION,
  advanceTournamentMatch,
  advanceTournamentTurn,
  createTournament,
  currentTournamentMatch,
  currentTournamentPlayer,
  decodeTournamentFile,
  recordTournamentTurn,
  startTournamentTurn,
} from './tournament.ts';
import type {
  PlayerCount,
  TournamentMatch,
  TournamentResult,
  TournamentState,
} from './tournament.ts';
import './tournament.css';

interface TournamentProps {
  game: GameState;
  feedback: string;
  announcement: number;
  activate(index: number): void;
  exportSnapshot(): string;
  loadBoard(code: string): boolean;
  loadSnapshot(text: string): boolean;
  resume(): void;
  leave(): void;
  backToGame(): void;
}

const EMPTY_NAMES = Array.from({ length: 8 }, () => '');

export function Tournament({
  game,
  feedback,
  announcement,
  activate,
  exportSnapshot,
  loadBoard,
  loadSnapshot,
  resume,
  leave,
  backToGame,
}: TournamentProps) {
  const [playerCount, setPlayerCount] = useState<PlayerCount>(4);
  const [names, setNames] = useState<string[]>(() => [...EMPTY_NAMES]);
  const [tournament, setTournament] = useState<TournamentState | null>(null);
  const [past, setPast] = useState(readPastTournaments);
  const [json, setJson] = useState('');
  const [notice, setNotice] = useState('');
  const board = useRef<BoardFocus>(null);
  const startTurnButton = useRef<HTMLButtonElement>(null);
  const activePhase = tournament?.phase;

  useEffect(() => writePastTournaments(past), [past]);

  useEffect(() => {
    if (!tournament || tournament.phase !== 'playing') return;
    const match = currentTournamentMatch(tournament);
    if (!isWon(game) || game.boardCode !== match.boardCode) return;
    const result: TournamentResult = { moves: game.moves, elapsedMs: game.elapsedMs };
    setTournament((current) => (current ? recordTournamentTurn(current, result) : current));
  }, [game, tournament]);

  useLayoutEffect(() => {
    if (tournament?.phase !== 'complete') return;
    const stored = readPastTournaments();
    if (!stored.some((entry) => entry.id === tournament.id)) {
      writePastTournaments([tournament, ...stored]);
    }
    setPast((current) =>
      current.some((entry) => entry.id === tournament.id) ? current : [tournament, ...current],
    );
  }, [tournament]);

  useEffect(() => {
    if (activePhase === 'playing') board.current?.focusRemembered();
  }, [activePhase]);

  useEffect(() => {
    if (activePhase === 'ready') startTurnButton.current?.focus();
  }, [activePhase]);

  function updateName(index: number, value: string): void {
    setNames((current) => current.map((name, entryIndex) => (entryIndex === index ? value : name)));
  }

  function start(): void {
    const players = names
      .slice(0, playerCount)
      .map(
        (name, index) =>
          name.trim().slice(0, TOURNAMENT_NAME_MAX_LENGTH) || `Player ${index + 1}`,
      );
    const initial = createTournament(players, freshBoardCode(game.size, game.seed));
    setTournament(initial);
    setNotice('');
  }

  function startTurn(): void {
    if (!tournament || tournament.phase !== 'ready') return;
    const match = currentTournamentMatch(tournament);
    if (!loadBoard(match.boardCode)) {
      setNotice('Could not start this tournament turn.');
      return;
    }
    setTournament(startTournamentTurn(tournament));
    setNotice('');
  }

  function nextTurn(): void {
    if (!tournament || tournament.phase !== 'turn-complete') return;
    const match = currentTournamentMatch(tournament);
    if (!loadBoard(match.boardCode)) {
      setNotice('Could not prepare the next turn.');
      return;
    }
    setTournament(advanceTournamentTurn(tournament));
    setNotice('');
  }

  function nextMatch(): void {
    if (!tournament || tournament.phase !== 'match-complete') return;
    const previousMatch = currentTournamentMatch(tournament);
    const previousBoard = parseBoardCode(previousMatch.boardCode);
    const nextCode = freshBoardCode(previousBoard?.size ?? game.size, previousBoard?.seed);
    const next = advanceTournamentMatch(tournament, nextCode);
    if (next === tournament) return;
    const match = currentTournamentMatch(next);
    if (!loadBoard(match.boardCode)) {
      setNotice('Could not prepare the next match.');
      return;
    }
    setTournament(next);
    setNotice('');
  }

  function exportTournament(): void {
    const saved = tournament ?? past[0] ?? null;
    const draftCount = tournament?.playerCount ?? playerCount;
    const draftNames = tournament
      ? [...tournament.players, ...Array.from({ length: 8 - tournament.players.length }, () => '')]
      : names;
    const match = tournament ? currentTournamentMatch(tournament) : null;
    const snapshot =
      tournament && match?.boardCode === game.boardCode ? exportSnapshot() : null;
    setJson(
      JSON.stringify(
        {
          version: TOURNAMENT_VERSION,
          draft: { playerCount: draftCount, players: draftNames },
          tournament: saved,
          gameSnapshot: snapshot,
        },
        null,
        2,
      ),
    );
    setNotice('Tournament JSON exported.');
  }

  function loadTournament(): void {
    const file = decodeTournamentFile(json);
    if (!file) {
      setNotice('Invalid tournament JSON.');
      return;
    }
    const savedTournament = file.tournament;
    const savedGame = file.gameSnapshot === null ? null : decodeSnapshot(file.gameSnapshot);
    if (
      (file.gameSnapshot !== null && !savedGame) ||
      (!savedTournament && savedGame) ||
      (savedTournament &&
        savedGame &&
        savedGame.boardCode !== currentTournamentMatch(savedTournament).boardCode)
    ) {
      setNotice('Invalid tournament JSON.');
      return;
    }

    let loadedTournament = savedTournament;
    if (loadedTournament?.phase === 'playing' && !savedGame) {
      loadedTournament = { ...loadedTournament, phase: 'ready' };
    }
    if (loadedTournament?.phase === 'playing' && savedGame) {
      if (!loadSnapshot(file.gameSnapshot!)) {
        setNotice('Invalid tournament JSON.');
        return;
      }
      resume();
    } else if (loadedTournament?.phase === 'ready') {
      if (!loadBoard(currentTournamentMatch(loadedTournament).boardCode)) {
        setNotice('Invalid tournament JSON.');
        return;
      }
    }

    setPlayerCount(file.draft.playerCount);
    setNames([...file.draft.players]);
    setTournament(loadedTournament);
    setNotice('Tournament loaded.');
  }

  const currentMatch = tournament ? currentTournamentMatch(tournament) : null;
  const nowPlaying =
    tournament && tournament.phase !== 'complete' && tournament.phase !== 'match-complete'
      ? currentTournamentPlayer(tournament)
      : null;
  const visibleBoard =
    currentMatch?.boardCode === game.boardCode &&
    (tournament?.phase === 'playing' ||
      ((tournament?.phase === 'turn-complete' ||
        tournament?.phase === 'match-complete' ||
        tournament?.phase === 'complete') &&
        isWon(game)));

  return (
    <section className="tournament-screen" aria-labelledby="tournament-title">
      <h2 id="tournament-title">Tournament</h2>
      <p className="tournament-intro">
        A knockout tournament for one device. Players take turns on the same deal; fewer moves wins.
        If moves tie, the faster time wins. If both tie exactly, the first player listed advances.
      </p>

      {!tournament ? (
        <section className="tournament-setup" aria-labelledby="setup-title">
          <h3 id="setup-title">{TournamentControl.setup}</h3>
          <div className="tournament-count">
            <label htmlFor="tournament-player-count">{TournamentControl.players}</label>
            <select
              id="tournament-player-count"
              className="control"
              value={playerCount}
              onChange={(event) => setPlayerCount(Number(event.currentTarget.value) as PlayerCount)}
            >
              <option value={4}>4</option>
              <option value={8}>8</option>
            </select>
          </div>
          <div className="tournament-name-grid">
            {names.map((name, index) => (
              <div className="tournament-name" key={index}>
                <label htmlFor={`tournament-player-${index + 1}`}>
                  {TournamentControl.player} {index + 1}
                </label>
                <input
                  id={`tournament-player-${index + 1}`}
                  className="control"
                  type="text"
                  maxLength={TOURNAMENT_NAME_MAX_LENGTH}
                  value={name}
                  placeholder={`Player ${index + 1}`}
                  onChange={(event) => updateName(index, event.currentTarget.value)}
                />
              </div>
            ))}
          </div>
          <div className="tournament-actions">
            <button type="button" className="control" onClick={start}>
              {TournamentControl.start}
            </button>
            <button type="button" className="control" onClick={leave}>
              {TournamentControl.leave}
            </button>
          </div>
        </section>
      ) : (
        <>
          <section className="tournament-current" aria-labelledby="current-match-title">
            <h3 id="current-match-title">
              {tournament.phase === 'complete'
                ? 'Tournament complete'
                : `Match ${tournament.currentMatch + 1} · ${roundTitle(
                    tournament.currentRound,
                    tournament.rounds.length,
                  )}`}
            </h3>
            {nowPlaying && (
              <p className="now-playing" role="status" aria-live="polite" aria-atomic="true">
                Now playing: {nowPlaying}
              </p>
            )}
            {tournament.phase === 'match-complete' && currentMatch?.winner && (
              <p className="match-winner">Winner: {currentMatch.winner}</p>
            )}
            {tournament.phase === 'ready' && (
              <button ref={startTurnButton} type="button" className="control" onClick={startTurn}>
                {TournamentControl.startTurn}
              </button>
            )}
            {tournament.phase === 'playing' && (
              <>
                <dl className="tournament-stats" aria-label="Current turn statistics">
                  <div>
                    <dt>Moves</dt>
                    <dd>{game.moves}</dd>
                  </div>
                  <div>
                    <dt>Time</dt>
                    <dd>{formatElapsed(game.elapsedMs)}</dd>
                  </div>
                </dl>
                <div className="game-result">
                  <p role="status" aria-live="polite" aria-atomic="true">
                    <span key={announcement}>{feedback}</span>
                  </p>
                </div>
              </>
            )}
            {visibleBoard && (
              <>
                <p id="board-help" className="help">
                  Use a pointer or Tab to enter the board. Arrow keys move between cards. Enter or
                  Space reveals a card.
                </p>
                <Board game={game} activate={activate} ref={board} />
              </>
            )}
            {tournament.phase === 'turn-complete' && (
              <div className="tournament-actions">
                <p>
                  {currentMatch?.players[0]} finished with {currentMatch?.results[0]?.moves} moves
                  in{' '}
                  {formatElapsed(currentMatch?.results[0]?.elapsedMs ?? 0)}.
                </p>
                <button type="button" className="control" onClick={nextTurn}>
                  {TournamentControl.nextTurn}
                </button>
              </div>
            )}
            {tournament.phase === 'match-complete' && (
              <div className="tournament-actions">
                <button type="button" className="control" onClick={nextMatch}>
                  {TournamentControl.nextMatch}
                </button>
                <button type="button" className="control" onClick={leave}>
                  {TournamentControl.leave}
                </button>
              </div>
            )}
            {tournament.phase === 'complete' && (
              <>
                <p className="champion" role="status" aria-live="polite" aria-atomic="true">
                  Champion: {tournament.champion}
                </p>
                <button type="button" className="control" onClick={backToGame}>
                  {TournamentControl.backToGame}
                </button>
              </>
            )}
            {tournament.phase !== 'complete' && tournament.phase !== 'match-complete' && (
              <button type="button" className="control tournament-leave" onClick={leave}>
                {TournamentControl.leave}
              </button>
            )}
          </section>
          <TournamentBracket
            tournament={tournament}
            game={game}
            titleId="current-bracket-title"
          />
        </>
      )}

      <section className="tournament-transfer" aria-labelledby="tournament-json-title">
        <h3 id="tournament-json-title">{TournamentControl.json}</h3>
        <label htmlFor="tournament-json">{TournamentControl.json}</label>
        <textarea
          id="tournament-json"
          className="control"
          rows={8}
          maxLength={TOURNAMENT_FILE_MAX_BYTES}
          spellCheck={false}
          value={json}
          onChange={(event) => setJson(event.currentTarget.value)}
        />
        <div className="tournament-actions">
          <button type="button" className="control" onClick={exportTournament}>
            {TournamentControl.export}
          </button>
          <button type="button" className="control" onClick={loadTournament}>
            {TournamentControl.load}
          </button>
        </div>
        <p className="tournament-notice" role="status" aria-live="polite">
          {notice}
        </p>
      </section>

      <section className="tournament-past" aria-labelledby="past-tournaments-title">
        <h3 id="past-tournaments-title">{TournamentControl.past}</h3>
        {past.length === 0 ? (
          <p>No completed tournaments yet.</p>
        ) : (
          <ol>
            {past.map((entry) => (
              <li key={entry.id}>
                <details className="past-tournament-entry">
                  <summary>
                    <strong>Champion: {entry.champion}</strong>
                    <span>
                      {entry.playerCount} players ·{' '}
                      {new Date(entry.createdAt).toLocaleDateString()}
                    </span>
                  </summary>
                  <TournamentBracket
                    tournament={entry}
                    game={game}
                    titleId={`past-bracket-title-${entry.id}`}
                  />
                </details>
              </li>
            ))}
          </ol>
        )}
      </section>
    </section>
  );
}

interface BracketProps {
  tournament: TournamentState;
  game: GameState;
  titleId: string;
}

function TournamentBracket({ tournament, game, titleId }: BracketProps) {
  return (
    <section className="tournament-bracket" aria-labelledby={titleId}>
      <h3 id={titleId}>{TournamentControl.bracket}</h3>
      <p className="bracket-rule">
        Fewer moves wins. Time breaks a tie; an exact tie goes to the first player listed.
      </p>
      <div className="bracket-rounds">
        {tournament.rounds.map((round, roundIndex) => (
          <section
            className="bracket-round"
            key={roundIndex}
            aria-label={roundTitle(roundIndex, tournament.rounds.length)}
          >
            <h4>{roundTitle(roundIndex, tournament.rounds.length)}</h4>
            <ol>
              {round.map((match, matchIndex) => (
                <li className="bracket-match" key={`${roundIndex}-${matchIndex}`}>
                  <h5>Match {matchIndex + 1}</h5>
                  {[0, 1].map((slot) => {
                    const result = visibleResult(
                      tournament,
                      match,
                      roundIndex,
                      matchIndex,
                      slot as 0 | 1,
                      game,
                    );
                    const isCurrent =
                      tournament.phase === 'playing' &&
                      tournament.currentRound === roundIndex &&
                      tournament.currentMatch === matchIndex &&
                      tournament.turn === slot &&
                      game.boardCode === match.boardCode &&
                      !match.results[slot as 0 | 1];
                    return (
                      <p
                        className={`bracket-player${
                          match.winner === match.players[slot] ? ' is-winner' : ''
                        }`}
                        key={slot}
                      >
                        <span>{match.players[slot] ?? 'TBD'}</span>
                        <span>
                          {result
                            ? `${result.moves} moves · ${formatElapsed(result.elapsedMs)}`
                            : '—'}
                          {isCurrent ? ' · current' : ''}
                        </span>
                      </p>
                    );
                  })}
                  <p className="bracket-winner">Winner: {match.winner ?? '—'}</p>
                </li>
              ))}
            </ol>
          </section>
        ))}
      </div>
    </section>
  );
}

function visibleResult(
  tournament: TournamentState,
  match: TournamentMatch,
  roundIndex: number,
  matchIndex: number,
  slot: 0 | 1,
  game: GameState,
): TournamentResult | null {
  const saved = match.results[slot];
  if (saved) return saved;
  if (
    tournament.phase === 'playing' &&
    tournament.currentRound === roundIndex &&
    tournament.currentMatch === matchIndex &&
    tournament.turn === slot &&
    game.boardCode === match.boardCode
  )
    return { moves: game.moves, elapsedMs: game.elapsedMs };
  return null;
}

function roundTitle(index: number, count: number): string {
  const roundsLeft = count - index;
  if (roundsLeft === 1) return 'Final';
  if (roundsLeft === 2) return 'Semi-finals';
  if (roundsLeft === 3) return 'Quarter-finals';
  return `Round ${index + 1}`;
}
