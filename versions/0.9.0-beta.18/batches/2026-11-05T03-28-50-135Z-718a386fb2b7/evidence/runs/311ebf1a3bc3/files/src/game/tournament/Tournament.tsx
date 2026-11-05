import { useEffect, useRef, useState } from 'react';
import { freshBoardCode } from '../session/fresh-board.ts';
import { Actions } from './Actions.tsx';
import { Bracket } from './Bracket.tsx';
import { Exchange } from './Exchange.tsx';
import { Setup } from './Setup.tsx';
import { LeaveDialog } from './LeaveDialog.tsx';
import { Turn } from './Turn.tsx';
import type { TurnHandle } from './Turn.tsx';
import { createTournament, normalizeNames, recordScore, roundName, roundSize } from './rules.ts';
import type { Score, TournamentData } from './rules.ts';
import { exportTournament, isEmptyTournament, readTournament } from './format.ts';
import { readHistory, saveHistory } from './storage.ts';
import './tournament.css';

const EMPTY = JSON.stringify(
  { format: 'neon-pairs/tournament', tournament: null, version: 1 },
  null,
  2,
);
export function Tournament({ back }: { back(): void }) {
  const [historyState] = useState(readHistory);
  const [history, setHistory] = useState(historyState.items);
  const [blocked, setBlocked] = useState(historyState.blocked);
  const [t, setT] = useState<TournamentData | null>(null);
  const [json, setJson] = useState('');
  const [notice, setNotice] = useState('');
  const [announcement, setAnnouncement] = useState(0);
  const [loadGeneration, setLoadGeneration] = useState(0);
  const heading = useRef<HTMLHeadingElement>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const turn = useRef<TurnHandle>(null);
  const pending = useRef<() => void>(() => {});
  function announce(text: string) {
    setNotice(text);
    setAnnouncement((n) => n + 1);
  }
  useEffect(() => {
    heading.current?.focus();
  }, [t === null ? 'setup' : t.phase]);
  function confirm(action: () => void) {
    if (t && t.phase !== 'complete') {
      pending.current = action;
      dialog.current?.showModal();
    } else action();
  }
  function start(drafts: string[], count: number) {
    const result = normalizeNames(drafts.slice(0, count));
    if (result.error) {
      announce(result.error);
      return;
    }
    const codes: string[] = [];
    for (let i = 0; i < count - 1; i++) {
      let code: string;
      do {
        code = freshBoardCode(roundSize(count, i));
      } while (codes.includes(code));
      codes.push(code);
    }
    setT(createTournament(result.names, codes));
    announce(`Now playing: ${result.names[0]}`);
  }
  function finish(score: Score) {
    if (!t || t.phase !== 'playing') return;
    const next = recordScore(t, score);
    setT(next);
    if (next.phase === 'complete') {
      const items = [next, ...history].slice(0, 10);
      setHistory(items);
      if (!saveHistory(items).saved) setBlocked(true);
      announce(`Champion: ${next.players[next.matches[next.index]!.winner!]}`);
    } else if (next.phase === 'matchDone')
      announce(`Winner: ${next.players[next.matches[next.index]!.winner!]}`);
    else announce('Turn complete.');
  }
  function load() {
    if (isEmptyTournament(json)) {
      confirm(() => {
        setT(null);
        announce('Tournament loaded.');
      });
      return;
    }
    const result = readTournament(json);
    if (!result.data) {
      announce(result.error);
      return;
    }
    const data = result.data;
    confirm(() => {
      setLoadGeneration((generation) => generation + 1);
      setT(data);
      announce('Tournament loaded.');
    });
  }
  const match = t?.matches[t.index];
  const player = t && match ? t.players[match.players[match.scores[0] ? 1 : 0]!] : '';
  return (
    <main>
      <header>
        <p className="eyebrow">A little focus. A perfect pair.</p>
        <h1>Neon Pairs</h1>
      </header>
      <h2 tabIndex={-1} ref={heading}>
        {t?.phase === 'complete' ? 'Tournament results' : 'Tournament'}
      </h2>
      <div className="game-result">
        <p role="status" aria-live="polite" aria-atomic="true">
          <span key={announcement}>{notice}</span>
        </p>
      </div>
      {!t && (
        <Setup
          history={history}
          blocked={blocked}
          start={start}
          back={back}
          open={(item) => {
            setT(item);
            announce('Tournament loaded.');
          }}
        />
      )}
      {t && match && (
        <>
          {t.phase === 'complete' ? (
            <p className="champion">Champion: {t.players[match.winner!]}</p>
          ) : (
            <>
              <p>Round: {roundName(t.players.length, t.index)}</p>
              <p>Now playing: {player}</p>
            </>
          )}
          <Actions t={t} setT={setT} announce={announce} back={back} confirm={confirm} />
          {t.phase === 'playing' && (
            <Turn
              ref={turn}
              key={`${loadGeneration}-${t.index}-${match.scores[0] ? 1 : 0}`}
              code={match.boardCode}
              snapshot={t.snapshot}
              finish={finish}
              feedback={announce}
            />
          )}
          <Bracket tournament={t} />
        </>
      )}
      <Exchange
        json={json}
        setJson={setJson}
        load={load}
        onExport={() => {
          setJson(
            t
              ? exportTournament({
                  ...t,
                  snapshot: t.phase === 'playing' ? (turn.current?.snapshot() ?? null) : null,
                })
              : EMPTY,
          );
          announce('Tournament exported.');
        }}
      />
      <LeaveDialog ref={dialog} leave={() => pending.current()} />
    </main>
  );
}
