import { useEffect, useRef, useState } from 'react';
import { Bracket } from './Bracket.tsx';
import { TournamentSetup } from './TournamentSetup.tsx';
import { TournamentExchange } from './TournamentExchange.tsx';
import { LeaveDialog } from './LeaveDialog.tsx';
import { newEvent } from './new-event.ts';
import { Turn } from './Turn.tsx';
import { exportTournament, readTournament } from './format.ts';
import { readHistory, saveHistory } from './history.ts';
import { nextMatch, nextTurn, normalizeNames, recordResult, roundName } from './rules.ts';
import type { Result, Tournament } from './rules.ts';

export function TournamentScreen({ back }: { back(): void }) {
  const heading = useRef<HTMLHeadingElement>(null);
  const turnRef = useRef<{ snapshot(): string }>(null);
  const [count, setCount] = useState(4);
  const [names, setNames] = useState(Array<string>(8).fill(''));
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [revision, setRevision] = useState(0);
  const [history, setHistory] = useState(readHistory);
  const [json, setJson] = useState('');
  const [notice, setNotice] = useState('');
  const [announcement, setAnnouncement] = useState(0);
  const [pending, setPending] = useState<(() => void) | null>(null);
  useEffect(() => heading.current?.focus(), [tournament?.phase, revision]);
  function publish(text: string) {
    setNotice(text);
    setAnnouncement((n) => n + 1);
  }
  function start() {
    const accepted = normalizeNames(names.slice(0, count));
    if (typeof accepted === 'string') {
      publish(accepted);
      return;
    }
    setTournament(newEvent(accepted));
    publish(`Now playing: ${accepted[0]}`);
  }
  function finish(result: Result) {
    if (!tournament || tournament.phase !== 'playing') return;
    const next = recordResult(tournament, result);
    setTournament(next);
    if (next.phase === 'complete') {
      const items = [next, ...history.items].slice(0, 10);
      const saved = saveHistory(items);
      setHistory({ items, blocked: history.blocked || !saved.saved });
      publish(`Champion: ${next.names[next.matches.at(-1)![0]!.winner! - 1]}`);
    }
  }
  function requestLeave(action: () => void) {
    if (tournament && tournament.phase !== 'complete') setPending(() => action);
    else action();
  }
  function exportCurrent() {
    const value =
      tournament?.phase === 'playing'
        ? { ...tournament, snapshot: turnRef.current?.snapshot() ?? null }
        : tournament;
    setJson(exportTournament(value));
    publish('Tournament exported.');
  }
  function load() {
    const result = readTournament(json);
    if (result.error) {
      publish(result.error);
      return;
    }
    requestLeave(() => {
      setTournament(result.value ?? null);
      setRevision((value) => value + 1);
      if (result.value?.phase === 'complete') {
        const items = [result.value, ...history.items].slice(0, 10);
        const saved = saveHistory(items);
        setHistory({ items, blocked: history.blocked || !saved.saved });
      }
      publish('Tournament loaded.');
    });
  }
  const match = tournament?.matches[tournament.currentRound]?.[tournament.currentMatch];
  const player = match && tournament ? tournament.names[match.players[tournament.turn]! - 1] : '';
  return (
    <main className="tournament-screen">
      <header>
        <p className="eyebrow">A little focus. A perfect pair.</p>
        <h1>Neon Pairs</h1>
      </header>
      <h2 ref={heading} tabIndex={-1}>
        Tournament
      </h2>
      <div className="game-result">
        <p role="status" aria-live="polite" aria-atomic="true">
          <span key={announcement}>{notice}</span>
        </p>
      </div>
      {!tournament && (
        <TournamentSetup
          count={count}
          setCount={setCount}
          names={names}
          setNames={setNames}
          start={start}
          back={back}
        />
      )}
      {tournament && match && (
        <>
          {tournament.phase === 'complete' ? (
            <>
              <p>Champion: {tournament.names[match.winner! - 1]}</p>
              <div className="tournament-actions">
                <button className="control" type="button" onClick={back}>
                  Back to game
                </button>
              </div>
            </>
          ) : (
            <>
              <p>Round: {roundName(tournament.matches[tournament.currentRound]!.length)}</p>
              <p>Now playing: {player}</p>
              <div className="tournament-actions">
                {tournament.phase === 'ready' && (
                  <button
                    className="control"
                    type="button"
                    onClick={() => {
                      setTournament({ ...tournament, phase: 'playing' });
                      publish(`Now playing: ${player}`);
                    }}
                  >
                    Start turn
                  </button>
                )}
                {tournament.phase === 'turnEnd' && (
                  <button
                    className="control"
                    type="button"
                    onClick={() => {
                      const next = nextTurn(tournament);
                      setTournament(next);
                      publish(`Now playing: ${next.names[match.players[1]! - 1]}`);
                    }}
                  >
                    Next turn
                  </button>
                )}
                {tournament.phase === 'matchEnd' && (
                  <button
                    className="control"
                    type="button"
                    onClick={() => {
                      const next = nextMatch(tournament);
                      setTournament(next);
                      const seed = next.matches[next.currentRound]![next.currentMatch]!.players[0]!;
                      publish(`Now playing: ${next.names[seed - 1]}`);
                    }}
                  >
                    Next match
                  </button>
                )}
                <button className="control" type="button" onClick={() => requestLeave(back)}>
                  Leave tournament
                </button>
              </div>
              {tournament.phase === 'playing' && (
                <Turn
                  key={`${revision}-${tournament.currentRound}-${tournament.currentMatch}-${tournament.turn}`}
                  ref={turnRef}
                  code={match.code}
                  snapshot={tournament.snapshot}
                  onResult={finish}
                  onFeedback={(text) => {
                    if (text) publish(text);
                  }}
                />
              )}
            </>
          )}
          <Bracket tournament={tournament} />
        </>
      )}
      <TournamentExchange
        json={json}
        setJson={setJson}
        exportCurrent={exportCurrent}
        load={load}
        history={history}
        publish={publish}
      />
      {pending && (
        <LeaveDialog
          keep={() => setPending(null)}
          leave={() => {
            setPending(null);
            pending();
          }}
        />
      )}
    </main>
  );
}
