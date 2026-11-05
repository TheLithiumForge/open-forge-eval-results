import { createTournament } from './create-tournament.ts';
import { useAnnouncement } from './use-announcement.ts';
import { TournamentHeader, TournamentStatus } from './TournamentChrome.tsx';
import { RoundInfo } from './RoundInfo.tsx';
import { Exchange } from './Exchange.tsx';
import { LeaveDialog } from './LeaveDialog.tsx';
import type { useTournamentHistory } from './use-history.ts';
import { Turn } from './Turn.tsx';
import { Setup } from './Setup.tsx';
import { Bracket } from './Bracket.tsx';
import { exportTournament, importTournament } from './exchange.ts';
import { useEffect, useRef, useState } from 'react';
import { nameError, normalizeName, recordResult } from './model.ts';
import type { Result, Tournament } from './model.ts';
import './tournament.css';

export function TournamentScreen({
  back,
  history,
}: {
  back(): void;
  history: ReturnType<typeof useTournamentHistory>;
}) {
  const [count, setCount] = useState(4);
  const [names, setNames] = useState(Array<string>(8).fill(''));
  const [event, setEvent] = useState<Tournament | null>(null);
  const [playing, setPlaying] = useState(false);
  const [playingTurn, setPlayingTurn] = useState(0);
  const [loadId, setLoadId] = useState(0);
  const [snapshot, setSnapshot] = useState<string | null>(null);
  const exporter = useRef<(() => string) | null>(null);
  const [draft, setDraft] = useState('');
  const [notice, setNotice] = useState('');
  const { announcement, announce } = useAnnouncement();
  function showNotice(text: string) {
    setNotice(text);
    announce(text);
  }
  const [confirmAction, setConfirmAction] = useState<(() => void) | null>(null);
  const match = event?.matches[event.index];
  const complete = !!event && event.index === event.matches.length - 1 && match?.winner !== null;
  function requestLeave(action: () => void) {
    if (event && !complete) setConfirmAction(() => action);
    else action();
  }
  function start() {
    const accepted = names.slice(0, count).map(normalizeName);
    const error = nameError(accepted);
    if (error) {
      showNotice(error);
      return;
    }
    setNotice('');
    setEvent(createTournament(accepted));
    setPlaying(false);
  }
  function finish(result: Result) {
    if (!event) return;
    const next = recordResult(event, result);
    setEvent(next);
    if (next.index === next.matches.length - 1 && next.matches[next.index]!.winner !== null)
      history.save(next);
  }
  function load() {
    const result = importTournament(draft);
    if (result.error) {
      showNotice(result.error);
      return;
    }
    const loaded = result.tournament;
    requestLeave(() => {
      setEvent(loaded);
      if (
        loaded &&
        loaded.index === loaded.matches.length - 1 &&
        loaded.matches[loaded.index]!.winner !== null &&
        !history.items.some((item) => exportTournament(item) === exportTournament(loaded))
      )
        history.save(loaded);
      setLoadId((id) => id + 1);
      setSnapshot(result.snapshot);
      setPlaying(!!result.snapshot);
      setPlayingTurn(loaded?.matches[loaded.index]?.results[0] === null ? 0 : 1);
      showNotice('Tournament loaded.');
    });
  }
  const turn = match?.results[0] === null ? 0 : 1;
  useEffect(() => {
    if (event && match && !complete)
      announce(`Now playing: ${event.names[match.players[match.results[0] === null ? 0 : 1]!]}`);
  }, [event?.index, match?.results[0], complete]);
  return (
    <main className="tournament">
      <TournamentHeader />
      {!event ? (
        <>
          <Setup
            count={count}
            setCount={setCount}
            names={names}
            setNames={setNames}
            start={start}
            blocked={history.blocked}
            history={history.items}
            open={(t) => {
              setEvent(t);
              setPlaying(false);
            }}
          />
          <button className="control" type="button" onClick={back}>
            Back to game
          </button>
        </>
      ) : (
        <>
          <RoundInfo event={event} complete={complete} turn={turn} />
          {!complete && !playing && match!.winner === null && (
            <button
              className="control"
              type="button"
              onClick={() => {
                setSnapshot(null);
                setPlayingTurn(turn);
                setPlaying(true);
              }}
            >
              Start turn
            </button>
          )}
          {!complete && playing && (
            <Turn
              key={`${event.index}-${playingTurn}-${loadId}`}
              code={match!.boardCode}
              finished={finish}
              snapshot={snapshot}
              exporter={exporter}
              announce={announce}
            />
          )}
          {!complete && playing && playingTurn === 0 && match!.results[0] && !match!.results[1] && (
            <button className="control" type="button" onClick={() => setPlaying(false)}>
              Next turn
            </button>
          )}
          {!complete && match!.winner !== null && (
            <button
              className="control"
              type="button"
              onClick={() => {
                setEvent({ ...event, index: event.index + 1 });
                setPlaying(false);
              }}
            >
              Next match
            </button>
          )}
          <Bracket event={event} />
          {complete ? (
            <button className="control" type="button" onClick={back}>
              Back to game
            </button>
          ) : (
            <button
              className="control"
              type="button"
              onClick={() =>
                requestLeave(() => {
                  setEvent(null);
                  setPlaying(false);
                })
              }
            >
              Leave tournament
            </button>
          )}
        </>
      )}
      <TournamentStatus announcement={announcement} />
      <Exchange
        draft={draft}
        setDraft={setDraft}
        notice={notice}
        exportData={() => {
          setDraft(
            exportTournament(
              event,
              playing && match?.results[playingTurn] === null
                ? (exporter.current?.() ?? null)
                : null,
            ),
          );
          showNotice('Tournament exported.');
        }}
        load={load}
      />
      <LeaveDialog confirmAction={confirmAction} setConfirmAction={setConfirmAction} />
    </main>
  );
}
