import { useEffect, useRef, useState } from 'react';
import { freshBoardCode } from '../session/fresh-board.ts';
import { Bracket } from './Bracket.tsx';
import { TournamentSetup } from './TournamentSetup.tsx';
import { readTournament } from './format.ts';
import { TournamentTurn } from './TournamentTurn.tsx';
import { Transfer } from './Transfer.tsx';
import {
  advanceMatch,
  createTournament,
  currentMatch,
  recordScore,
  updateMatch,
} from './tournament.ts';
import type { Score, TournamentData } from './tournament.ts';
import './tournament.css';

const HISTORY_KEY = 'neon-pairs.tournaments.v1';

function readHistory(): TournamentData[] {
  try {
    const values: unknown = JSON.parse(localStorage.getItem(HISTORY_KEY) ?? '[]');
    if (!Array.isArray(values)) return [];
    return values.flatMap((value: unknown) => {
      const item = readTournament(JSON.stringify(value));
      return item?.phase === 'complete' ? [item] : [];
    });
  } catch {
    return [];
  }
}

interface Props {
  size: number;
  back(): void;
}
export function Tournament({ size, back }: Props) {
  const [count, setCount] = useState(4);
  const [names, setNames] = useState<string[]>(Array(8).fill(''));
  const [data, setData] = useState<TournamentData | null>(null);
  const [history, setHistory] = useState(readHistory);
  const [notice, setNotice] = useState('');
  const [loadKey, setLoadKey] = useState(0);
  const turn = useRef<{ exportSnapshot(): string }>(null);
  const match = data ? currentMatch(data) : null;
  useEffect(() => {
    if (!data || data.phase !== 'complete') return;
    setHistory((old) => {
      if (old.some((item) => JSON.stringify(item) === JSON.stringify(data))) return old;
      const next = [data, ...old];
      try {
        localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
      } catch {
        /* Storage can be unavailable. */
      }
      return next;
    });
  }, [data]);

  function start(): void {
    const players = names.slice(0, count).map((name) => name.trim());
    if (players.some((name) => !name)) {
      setNotice('Enter a name for every player.');
      return;
    }
    setNotice('');
    setData(createTournament(players, size));
  }
  function startTurn(): void {
    if (!data || !match) return;
    const boardCode = match.boardCode ?? freshBoardCode(data.size);
    setNotice('');
    setData({ ...updateMatch(data, { ...match, boardCode }), phase: 'playing', snapshot: null });
  }
  function finished(score: Score): void {
    if (!data || data.phase !== 'playing') return;
    const next = recordScore(data, score);
    if (next.phase === 'ready')
      setNotice('The scores are tied. Play the match again on a new deal.');
    setData(
      next.phase === 'matchDone' && next.round === next.rounds.length - 1
        ? { ...next, phase: 'complete' }
        : next,
    );
  }
  return (
    <main className="tournament">
      <header>
        <p className="eyebrow">A little focus. A perfect pair.</p>
        <h1>Tournament</h1>
      </header>
      {!data ? (
        <>
          <TournamentSetup
            count={count}
            setCount={setCount}
            names={names}
            setNames={setNames}
            size={size}
            start={start}
            back={back}
            history={history}
            open={(item) => {
              setData(item);
              setNotice('');
            }}
          />
        </>
      ) : (
        <>
          {data.phase === 'complete' ? (
            <>
              <h2>Champion: {data.names[match?.winner ?? 0]}</h2>
              <button className="control" onClick={back}>
                Back to game
              </button>
            </>
          ) : (
            <>
              <p className="now-playing">
                Now playing: {data.names[match?.players[data.turn] ?? 0]}
              </p>
              <div className="tournament-actions">
                {data.phase === 'ready' && (
                  <button className="control" onClick={startTurn}>
                    Start turn
                  </button>
                )}
                {data.phase === 'turnDone' && (
                  <button
                    className="control"
                    onClick={() => setData({ ...data, turn: 1, phase: 'ready' })}
                  >
                    Next turn
                  </button>
                )}
                {data.phase === 'matchDone' && (
                  <button className="control" onClick={() => setData(advanceMatch(data))}>
                    Next match
                  </button>
                )}
                <button
                  className="control"
                  onClick={() => {
                    setData(null);
                    setNotice('Tournament ended.');
                  }}
                >
                  Leave tournament
                </button>
              </div>
              {data.phase === 'playing' && match?.boardCode && (
                <TournamentTurn
                  key={`${data.round}-${data.match}-${data.turn}-${loadKey}`}
                  code={match.boardCode}
                  snapshot={data.snapshot}
                  finished={finished}
                  ref={turn}
                />
              )}
            </>
          )}
          <Bracket data={data} />
        </>
      )}
      <Transfer
        data={data}
        count={count}
        names={names}
        turn={turn}
        notice={setNotice}
        load={(loaded) => {
          setData(loaded);
          setLoadKey((key) => key + 1);
        }}
        loadSetup={(newCount, newNames) => {
          setCount(newCount);
          setNames(newNames);
          setData(null);
        }}
      />
      <p role="status" aria-live="polite">
        {notice}
      </p>
    </main>
  );
}
