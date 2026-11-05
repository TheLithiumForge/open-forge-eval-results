import { useEffect, useRef, useState } from 'react';
import { freshBoardCode } from '../session/fresh-board.ts';
import { browserStore } from '../session/use-saved-preferences.ts';
import { TournamentBracket } from './TournamentBracket.tsx';
import { PastTournaments } from './PastTournaments.tsx';
import { TournamentSetup } from './TournamentSetup.tsx';
import { TournamentTransfer } from './TournamentTransfer.tsx';
import { TournamentTurn } from './TournamentTurn.tsx';
import { decodeTournament, encodeTournament } from './tournament-format.ts';
import {
  advanceTournament,
  createTournament,
  currentTournamentMatch,
  finishTournamentTurn,
} from './tournament.ts';
import { readTournaments, writeTournaments } from './tournament-storage.ts';
import type { TournamentTurnHandle } from './TournamentTurn.tsx';
import type { TournamentScore, TournamentState } from './tournament.ts';
import '../controls/control.css';
import '../controls/reproduction.css';
import './tournament.css';

interface TournamentProps {
  size: number;
  back(): void;
}

function mergeHistory(entries: readonly TournamentState[]): readonly TournamentState[] {
  return [...new Map([...entries].reverse().map((entry) => [entry.id, entry])).values()].reverse();
}

export function Tournament({ size, back }: TournamentProps) {
  const [store] = useState(browserStore);
  const [past, setPast] = useState(() => readTournaments(store));
  const [tournament, setTournament] = useState<TournamentState | null>(null);
  const [notice, setNotice] = useState('');
  const [saveNotice, setSaveNotice] = useState('');
  const turnGame = useRef<TournamentTurnHandle>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    heading.current?.focus();
  }, [tournament?.id, tournament?.phase, tournament?.currentMatch, tournament?.turn]);
  useEffect(() => {
    setSaveNotice(past.length ? writeTournaments(store, past) : '');
  }, [past, store]);

  function start(players: readonly string[]): void {
    const codes = Array.from({ length: players.length - 1 }, () => freshBoardCode(size));
    setTournament(createTournament(players, codes, crypto.randomUUID()));
    setNotice('');
  }
  function complete(score: TournamentScore): void {
    if (!tournament) return;
    const next = finishTournamentTurn(tournament, score);
    setTournament(next);
    if (next.phase === 'complete') setPast(mergeHistory([next, ...past]));
  }
  function exportTournament(): string {
    const snapshot = tournament?.phase === 'playing' ? turnGame.current?.exportSnapshot() : null;
    return encodeTournament({
      version: 1,
      tournament: snapshot && tournament ? { ...tournament, snapshot } : tournament,
      pastTournaments: past,
    });
  }
  function loadTournament(text: string): void {
    const archive = decodeTournament(text);
    if (!archive) {
      setNotice('Invalid tournament JSON.');
      return;
    }
    const finished = archive.tournament?.phase === 'complete' ? [archive.tournament] : [];
    setPast(mergeHistory([...finished, ...archive.pastTournaments, ...past]));
    setTournament(archive.tournament);
    setNotice(
      archive.tournament?.phase === 'ready'
        ? 'Tournament loaded. Select Start turn to continue.'
        : 'Tournament loaded.',
    );
  }

  const match = tournament ? currentTournamentMatch(tournament) : null;
  const player = tournament && match ? match.players[tournament.turn] : null;
  const champion = tournament?.matches.at(-1)?.winner;
  return (
    <div className="tournament">
      <h2 ref={heading} tabIndex={-1}>
        {tournament
          ? tournament.phase === 'complete'
            ? `Champion: ${champion == null ? '' : tournament.players[champion]}`
            : `Now playing: ${player === null ? '' : tournament.players[player]}`
          : 'Tournament'}
      </h2>
      {!tournament ? (
        <>
          <TournamentSetup size={size} start={start} />
          <button type="button" className="control" onClick={back}>
            Back to game
          </button>
          <PastTournaments
            past={past}
            view={(entry) => {
              setTournament(entry);
              setNotice('');
            }}
          />
        </>
      ) : (
        <>
          <p>
            Match {tournament.currentMatch + 1} of {tournament.matches.length}
          </p>
          <div className="control-row tournament-actions">
            {tournament.phase === 'ready' && (
              <button
                type="button"
                className="control"
                onClick={() => {
                  setTournament({ ...tournament, phase: 'playing' });
                  setNotice('');
                }}
              >
                Start turn
              </button>
            )}
            {(tournament.phase === 'turnComplete' || tournament.phase === 'matchComplete') && (
              <button
                type="button"
                className="control"
                onClick={() => setTournament(advanceTournament(tournament))}
              >
                {tournament.phase === 'turnComplete' ? 'Next turn' : 'Next match'}
              </button>
            )}
            {tournament.phase === 'complete' ? (
              <>
                <button type="button" className="control" onClick={back}>
                  Back to game
                </button>
                <button type="button" className="control" onClick={() => setTournament(null)}>
                  New tournament
                </button>
              </>
            ) : (
              <button type="button" className="control" onClick={back}>
                Leave tournament
              </button>
            )}
          </div>
          {tournament.phase === 'ready' && (
            <p className="help">
              Pass the device to {player === null ? '' : tournament.players[player]}, then select
              Start turn.
            </p>
          )}
          {tournament.phase === 'playing' && match && (
            <TournamentTurn
              key={`${tournament.id}/${tournament.currentMatch}/${tournament.turn}`}
              ref={turnGame}
              code={match.boardCode}
              snapshot={tournament.snapshot}
              complete={complete}
            />
          )}
          {tournament.phase === 'turnComplete' && (
            <p>Game finished. Select Next turn to pass the device.</p>
          )}
          {tournament.phase === 'matchComplete' && match && match.winner !== null && (
            <p>Match winner: {tournament.players[match.winner]}</p>
          )}
          <TournamentBracket tournament={tournament} />
        </>
      )}
      <TournamentTransfer exportTournament={exportTournament} loadTournament={loadTournament} />
      <p role="status" aria-live="polite" aria-atomic="true">
        {notice}
      </p>
      {saveNotice && <p role="alert">{saveNotice}</p>}
    </div>
  );
}
