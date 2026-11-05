import { useEffect, useRef, useState } from 'react';
import { decodeTournament, encodeTournament } from './format.ts';
import { finishTurn, nameError, newMatch, normalizeName } from './rules.ts';
import type { Result, TournamentState } from './rules.ts';
import { KEY, readHistory, nextCode } from './history.ts';
import { Setup } from './Setup.tsx';
import { Active } from './Active.tsx';
import type { PlayHandle } from './Playing.tsx';
import './tournament.css';
export function Tournament({ back }: { back(): void }) {
  const [count, setCount] = useState(4);
  const [drafts, setDrafts] = useState<string[]>(() => Array(8).fill(''));
  const [t, setT] = useState<TournamentState | null>(null);
  const [history, setHistory] = useState(readHistory);
  const [json, setJson] = useState('');
  const [notice, setNotice] = useState({ text: '', id: 0 });
  function publish(text: string) {
    setNotice((previous) => ({ text, id: previous.id + 1 }));
  }
  const [playKey, setPlayKey] = useState(0);
  const heading = useRef<HTMLHeadingElement>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const pendingLoad = useRef<ReturnType<typeof decodeTournament> | null>(null);
  const play = useRef<PlayHandle>(null);
  useEffect(() => {
    heading.current?.focus();
    if (!t) return;
    const match = t.matches.at(-1)!;
    if (t.phase === 'ready')
      publish(`Now playing: ${t.names[match.players[match.results[0] ? 1 : 0]]}`);
    if (t.phase === 'turnDone')
      publish(`${t.names[match.players[0]]} finished in ${match.results[0]?.moves} moves.`);
    if (t.phase === 'matchDone') publish(`${t.names[match.winner!]} wins the match.`);
    if (t.phase === 'complete') publish(`${t.names[match.winner!]} wins the tournament.`);
  }, [t?.phase]);
  function persist(done: TournamentState) {
    const items = [done, ...history.items].slice(0, 10);
    let blocked = false;
    try {
      localStorage.setItem(KEY, JSON.stringify({ v: 3, items }));
    } catch {
      blocked = true;
    }
    setHistory({ items, blocked });
  }
  function start() {
    const names = drafts.slice(0, count).map(normalizeName);
    const error = nameError(names);
    if (error) {
      publish(error);
      return;
    }
    const initial: TournamentState = { names, matches: [], phase: 'ready', snapshot: null };
    setT({ ...initial, matches: [newMatch(names, [], nextCode(initial))] });
    publish('');
  }
  function completeTurn(result: Result) {
    if (!t) return;
    const updated = finishTurn(t, result);
    setT(updated);
    if (updated.phase === 'complete') persist(updated);
  }
  function exportData() {
    const current =
      t?.phase === 'playing' ? { ...t, snapshot: play.current?.snapshot() ?? null } : t;
    setJson(encodeTournament(current, drafts, count));
    publish('Tournament exported.');
  }
  function load() {
    const data = decodeTournament(json);
    if (typeof data === 'string') {
      publish(data);
      return;
    }
    if (t && t.phase !== 'complete') {
      pendingLoad.current = data;
      dialog.current?.showModal();
      return;
    }
    applyLoad(data);
  }
  function applyLoad(data: Exclude<ReturnType<typeof decodeTournament>, string>) {
    setT(data.tournament);
    setCount(data.count);
    setDrafts(data.drafts);
    setPlayKey((key) => key + 1);
    publish('Tournament loaded.');
    if (data.tournament?.phase === 'complete') persist(data.tournament);
  }
  const last = t?.matches.at(-1);
  const player = last ? last.players[last.results[0] ? 1 : 0] : 0;
  return (
    <main className="tournament">
      <header>
        <h1>Neon Pairs</h1>
      </header>
      <h2 ref={heading} tabIndex={-1}>
        Tournament
      </h2>
      <div className="game-result">
        <p role="status" aria-live="polite" aria-atomic="true">
          <span
            className={notice.text.startsWith('Now playing:') ? 'visually-hidden' : undefined}
            key={notice.id}
          >
            {notice.text}
          </span>
        </p>
      </div>
      {!t && (
        <Setup
          count={count}
          setCount={setCount}
          drafts={drafts}
          setDrafts={setDrafts}
          start={start}
          history={history}
          setT={setT}
          clearNotice={() => publish('')}
          back={back}
        />
      )}
      {t && last && (
        <Active
          t={t}
          last={last}
          player={player}
          playKey={playKey}
          setPlayKey={setPlayKey}
          setT={setT}
          play={play}
          completeTurn={completeTurn}
          publish={publish}
          back={back}
          leave={() => {
            pendingLoad.current = null;
            dialog.current?.showModal();
          }}
        />
      )}
      <div className="exchange">
        <label htmlFor="tournament-json">Tournament JSON</label>
        <textarea
          className="control"
          id="tournament-json"
          value={json}
          onChange={(e) => setJson(e.currentTarget.value)}
        />
        <div className="actions">
          <button className="control" type="button" onClick={exportData}>
            Export tournament
          </button>
          <button className="control" type="button" onClick={load}>
            Load tournament
          </button>
        </div>
      </div>
      <dialog ref={dialog}>
        <p>Leave this tournament?</p>
        <div className="actions">
          <button
            className="control"
            type="button"
            autoFocus
            onClick={() => dialog.current?.close()}
          >
            Keep playing
          </button>
          <button
            className="control"
            type="button"
            onClick={() => {
              dialog.current?.close();
              const pending = pendingLoad.current;
              pendingLoad.current = null;
              if (pending && typeof pending !== 'string') applyLoad(pending);
              else back();
            }}
          >
            Leave
          </button>
        </div>
      </dialog>
    </main>
  );
}
