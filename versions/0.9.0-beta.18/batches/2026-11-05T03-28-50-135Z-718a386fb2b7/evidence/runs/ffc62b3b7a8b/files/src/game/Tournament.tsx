import { useEffect, useRef, useState } from 'react';
import { isWon } from './game.ts';
import { useGame } from './session/use-game.ts';
import { freshBoardCode } from './session/fresh-board.ts';
import { Bracket } from './tournament/Bracket.tsx';
import { Exchange } from './tournament/Exchange.tsx';
import { Setup } from './tournament/Setup.tsx';
import { Turn } from './tournament/Turn.tsx';
import { LeaveDialog } from './tournament/LeaveDialog.tsx';
import { useTournamentAnnouncements } from './tournament/use-announcements.ts';
import { decodeTournament, encodeTournament } from './tournament/format.ts';
import { readHistory, saveHistory } from './tournament/storage.ts';
import { nextMatch, recordResult, roundName, roundSize, winner } from './tournament/tournament.ts';
import type { TournamentState } from './tournament/tournament.ts';
import './tournament/tournament.css';

export function Tournament({ back }: { back(): void }) {
  const controller = useGame(true);
  const [event, setEvent] = useState<TournamentState | null>(null);
  const [json, setJson] = useState('');
  const [notice, setNotice] = useState('');
  const { announcement, announce } = useTournamentAnnouncements(event, controller.session);
  function report(message: string) {
    setNotice(message);
    announce(message);
  }
  const [historyState] = useState(readHistory);
  const [history, setHistory] = useState(historyState.items);
  const [blocked, setBlocked] = useState(historyState.blocked);
  const heading = useRef<HTMLHeadingElement>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const pending = useRef<(() => void) | null>(null);
  const saved = useRef<TournamentState | null>(null);
  const screen = event?.phase ?? 'setup';
  useEffect(() => {
    heading.current?.focus();
  }, [screen]);
  useEffect(() => {
    if (event?.phase === 'playing' && isWon(controller.session.game)) {
      setEvent(
        recordResult(event, {
          moves: controller.session.game.moves,
          elapsedMs: controller.session.game.elapsedMs,
        }),
      );
    }
  }, [event, controller.session.game]);
  useEffect(() => {
    if (!event || event.phase !== 'champion' || saved.current === event) return;
    saved.current = event;
    const updated = [event, ...history].slice(0, 10);
    if (!saveHistory(updated).saved) setBlocked(true);
    setHistory(updated);
  }, [event, history]);
  function confirm(action: () => void) {
    if (event && event.phase !== 'champion') {
      pending.current = action;
      dialog.current?.showModal();
    } else action();
  }
  function newMatch(current: TournamentState): TournamentState {
    const size = roundSize(current.names.length, current.matches.length);
    let code = freshBoardCode(size);
    while (current.matches.some((match) => match.boardCode === code)) code = freshBoardCode(size);
    return nextMatch(current, code);
  }
  function startTurn() {
    if (!event) return;
    const match = event.matches[event.matches.length - 1]!;
    controller.loadBoard(match.boardCode);
    setEvent({ ...event, phase: 'playing' });
  }
  function exportData() {
    const snapshot =
      event?.phase === 'playing' && !isWon(controller.session.game)
        ? controller.exportSnapshot()
        : null;
    setJson(encodeTournament({ tournament: event, snapshot }));
    report('Tournament exported.');
  }
  function load() {
    const result = decodeTournament(json);
    if (!result.data) {
      report(result.error ?? 'Invalid tournament.');
      return;
    }
    const data = result.data;
    confirm(() => {
      if (data.snapshot) {
        controller.loadSnapshot(data.snapshot);
        controller.resume();
      }
      setEvent(data.tournament);
      report('Tournament loaded.');
    });
  }
  const match = event?.matches[event.matches.length - 1];
  const player = match?.players[match.results.length];
  return (
    <main>
      <header>
        <p className="eyebrow">A little focus. A perfect pair.</p>
        <h1>Neon Pairs</h1>
      </header>
      <h2 ref={heading} tabIndex={-1}>
        {screen === 'champion'
          ? 'Tournament complete'
          : screen === 'playing'
            ? 'Tournament turn'
            : 'Tournament'}
      </h2>
      <div className="game-result">
        <p
          role="status"
          aria-live="polite"
          aria-atomic="true"
          className={
            announcement.text.startsWith('Pair found.') || announcement.text.startsWith('No match.')
              ? undefined
              : 'visually-hidden'
          }
        >
          <span key={announcement.id}>{announcement.text}</span>
        </p>
      </div>
      {!event ? (
        <Setup
          announce={announce}
          history={history}
          blocked={blocked}
          back={back}
          start={(names) => setEvent(newMatch({ names, matches: [], phase: 'ready' }))}
        />
      ) : (
        <>
          {event.phase === 'champion' ? (
            <>
              <p>Champion: {event.names[winner(match!)]}</p>
              <button type="button" className="control" onClick={back}>
                Back to game
              </button>
            </>
          ) : (
            <>
              <p>Round: {roundName(roundSize(event.names.length, event.matches.length - 1))}</p>
              {(event.phase === 'ready' || event.phase === 'playing') && (
                <p>Now playing: {event.names[player!]}</p>
              )}
              <div className="tournament-actions">
                {event.phase === 'ready' && (
                  <button type="button" className="control" onClick={startTurn}>
                    Start turn
                  </button>
                )}
                {event.phase === 'turnComplete' && (
                  <button
                    type="button"
                    className="control"
                    onClick={() => setEvent({ ...event, phase: 'ready' })}
                  >
                    Next turn
                  </button>
                )}
                {event.phase === 'matchComplete' && (
                  <button
                    type="button"
                    className="control"
                    onClick={() =>
                      setEvent(
                        event.matches.length === event.names.length - 1
                          ? { ...event, phase: 'champion' }
                          : newMatch(event),
                      )
                    }
                  >
                    Next match
                  </button>
                )}
                <button type="button" className="control" onClick={() => confirm(back)}>
                  Leave tournament
                </button>
              </div>
            </>
          )}
          {event.phase === 'playing' && <Turn controller={controller} />}
          <Bracket tournament={event} />
        </>
      )}
      <Exchange text={json} change={setJson} exportData={exportData} load={load} notice={notice} />
      <LeaveDialog dialog={dialog} pending={pending} />
    </main>
  );
}
