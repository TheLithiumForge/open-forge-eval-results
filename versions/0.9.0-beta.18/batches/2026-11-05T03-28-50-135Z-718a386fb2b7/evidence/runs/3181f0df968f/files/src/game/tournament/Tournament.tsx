import { useEffect, useRef, useState } from 'react';
import { freshBoardCode } from '../session/fresh-board.ts';
import { Confirm } from './Confirm.tsx';
import { exportTournament, importTournament } from './format.ts';
import { finishTurn, nameError, newTournament, normalizeName, roundSize } from './rules.ts';
import { readHistory, saveHistory } from './storage.ts';
import { EventView } from './EventView.tsx';
import { Setup } from './Setup.tsx';
import type { Result, TournamentData } from './rules.ts';
import './tournament.css';

export function Tournament({ back }: { back(): void }) {
  const [count, setCount] = useState(4);
  const [names, setNames] = useState(Array<string>(8).fill(''));
  const [event, setEvent] = useState<TournamentData | null>(null);
  const [history, setHistory] = useState(readHistory);
  const [draft, setDraft] = useState('');
  const [revision, setRevision] = useState(0);
  const [notice, setNotice] = useState('');
  const [announcement, setAnnouncement] = useState(0);
  const [pending, setPending] = useState<(() => void) | null>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const snapshot = useRef<(() => string) | null>(null);
  useEffect(() => {
    heading.current?.focus();
  }, []);
  function publish(text: string) {
    setNotice(text);
    setAnnouncement((n) => n + 1);
  }
  function orient() {
    requestAnimationFrame(() => heading.current?.focus());
  }
  function replace(action: () => void) {
    if (event && event.phase !== 'champion') setPending(() => action);
    else action();
  }
  function start() {
    const accepted = names.slice(0, count).map(normalizeName);
    const error = nameError(accepted);
    if (error) {
      publish(error);
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
    setEvent(newTournament(accepted, codes));
    publish(`Turn: ${accepted[0]}`);
    orient();
  }
  function turnFinished(result: Result) {
    setEvent((current) => (current ? finishTurn(current, result) : current));
    orient();
  }
  function nextMatch() {
    if (!event) return;
    if (event.current === event.matches.length - 1) {
      const champion: TournamentData = { ...event, phase: 'champion' };
      const items = [champion, ...history.items].slice(0, 10);
      setHistory({ items, ...saveHistory(items) });
      setEvent(champion);
      publish(`Champion: ${champion.names[champion.matches[champion.current]!.winner!]}`);
    } else {
      const next = { ...event, current: event.current + 1, phase: 'ready' as const };
      setEvent(next);
      publish(`Turn: ${next.names[next.matches[next.current]!.players[0]!]}`);
    }
    orient();
  }
  function load() {
    const parsed = importTournament(draft);
    if (parsed.error) {
      publish(parsed.error);
      return;
    }
    replace(() => {
      if (parsed.tournament?.phase === 'champion') {
        const encoded = exportTournament(parsed.tournament);
        const items = [
          parsed.tournament,
          ...history.items.filter((item) => exportTournament(item) !== encoded),
        ].slice(0, 10);
        setHistory({ items, ...saveHistory(items) });
      }
      setEvent(parsed.tournament);
      setRevision((value) => value + 1);
      publish('Tournament loaded.');
      orient();
    });
  }
  return (
    <main className="tournament">
      <header>
        <p className="eyebrow">A little focus. A perfect pair.</p>
        <h1>Neon Pairs</h1>
      </header>
      <h2 tabIndex={-1} ref={heading}>
        Tournament
      </h2>
      <div className="game-result">
        <p role="status" aria-live="polite" aria-atomic="true">
          <span key={announcement}>{notice}</span>
        </p>
      </div>
      {!event ? (
        <Setup
          count={count}
          setCount={setCount}
          names={names}
          setNames={setNames}
          start={start}
          back={back}
          history={history}
          open={(item) => {
            setEvent(item);
            publish('Tournament loaded.');
            orient();
          }}
        />
      ) : (
        <EventView
          event={event}
          revision={revision}
          back={back}
          leave={() => replace(back)}
          nextMatch={nextMatch}
          finish={turnFinished}
          capture={(fn) => {
            snapshot.current = fn;
          }}
          announce={publish}
          update={(next, text) => {
            setEvent(next);
            publish(text);
            orient();
          }}
        />
      )}
      <label className="tournament-json">
        Tournament JSON
        <textarea
          className="control"
          value={draft}
          onChange={(e) => setDraft(e.currentTarget.value)}
        />
      </label>
      <div className="tournament-actions">
        <button
          className="control"
          onClick={() => {
            setDraft(
              exportTournament(
                event?.phase === 'playing'
                  ? { ...event, snapshot: snapshot.current?.() ?? null }
                  : event,
              ),
            );
          }}
        >
          Export tournament
        </button>
        <button className="control" onClick={load}>
          Load tournament
        </button>
      </div>
      {pending && (
        <Confirm
          cancel={() => setPending(null)}
          leave={() => {
            const action = pending;
            setPending(null);
            action();
          }}
        />
      )}
    </main>
  );
}
