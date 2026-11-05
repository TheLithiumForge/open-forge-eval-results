import { useLayoutEffect, useRef, useState } from 'react';
import { useTournament } from '../session/use-tournament.ts';
import { currentPlayer, normalizePlayerName } from './rules.ts';
import { TournamentPhase } from './model.ts';
import { encodeTournament, readTournamentDocument } from './format.ts';
import { Setup } from './Setup.tsx';
import { Bracket } from './Bracket.tsx';
import { Exchange } from './Exchange.tsx';
import { History } from './History.tsx';
import { LeaveDialog } from './LeaveDialog.tsx';
import { Turn } from './Turn.tsx';
import type { TournamentDocument, TournamentSetup } from './model.ts';
import type { useTournamentHistory } from './use-history.ts';
import './tournament.css';

interface TournamentProps {
  publish(text: string): void;
  back(): void;
  history: ReturnType<typeof useTournamentHistory>;
}

const EMPTY_SETUP: TournamentSetup = { count: 4, names: ['', '', '', ''] };

export function Tournament({ publish, back, history }: TournamentProps) {
  const controller = useTournament(publish, history.save);
  const { tournament } = controller.session;
  const [setup, setSetup] = useState(EMPTY_SETUP);
  const [draft, setDraft] = useState('');
  const [notice, setNotice] = useState('');
  const [pending, setPending] = useState<(() => void) | null>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const complete = tournament?.phase === TournamentPhase.complete;
  const phase = tournament?.phase;
  useLayoutEffect(() => {
    heading.current?.focus();
  }, [phase, controller.session.generation]);

  function report(text: string): void {
    setNotice(text);
    publish(text);
  }
  function request(action: () => void): void {
    const unfinished = tournament ? !complete : setup.names.some((name) => name.trim());
    if (unfinished) setPending(() => action);
    else action();
  }
  function install(document: TournamentDocument): void {
    if (document.setup) setSetup(document.setup);
    controller.install(document.tournament, true);
    if (document.tournament?.phase === TournamentPhase.complete) history.save(document.tournament);
    const event = document.tournament;
    report(
      !event
        ? 'Loaded tournament.'
        : event.phase === TournamentPhase.complete
          ? `Loaded tournament. Champion: ${event.names[event.matches.at(-1)!.winner!]}`
          : `Loaded tournament. Now playing: ${event.names[currentPlayer(event)]}`,
    );
  }
  function load(): void {
    const result = readTournamentDocument(draft);
    if (!result.document) {
      report(result.error);
      return;
    }
    const document = result.document;
    request(() => install(document));
  }
  function reset(): void {
    controller.install(null);
    setSetup(EMPTY_SETUP);
    setNotice('');
    publish('Tournament setup.');
  }
  return (
    <section className="tournament" aria-labelledby="tournament-heading">
      <h2
        id="tournament-heading"
        tabIndex={-1}
        ref={heading}
        className={
          complete ? `victory${controller.session.celebration ? ' celebrate' : ''}` : undefined
        }
      >
        {complete
          ? `Champion: ${tournament.names[tournament.matches.at(-1)!.winner!]}`
          : 'Tournament'}
      </h2>
      {!tournament && (
        <Setup
          setup={setup}
          change={setSetup}
          start={(names) => {
            setNotice('');
            controller.start(names);
          }}
          notice={report}
        />
      )}
      {tournament && (
        <>
          {!complete && (
            <Turn
              tournament={tournament}
              paused={controller.session.paused}
              generation={controller.session.generation}
              celebration={controller.session.celebration}
              startTurn={controller.startTurn}
              next={controller.next}
              activate={controller.activate}
            />
          )}
          <Bracket tournament={tournament} />
        </>
      )}
      <div className="tournament-actions">
        {tournament && !complete && (
          <button className="control" type="button" onClick={() => request(reset)}>
            Leave tournament
          </button>
        )}
        {complete && (
          <button className="control" type="button" onClick={reset}>
            Back to tournaments
          </button>
        )}
        {(!tournament || complete) && (
          <button className="control" type="button" onClick={() => request(back)}>
            Back to game
          </button>
        )}
      </div>
      <Exchange
        draft={draft}
        change={setDraft}
        load={load}
        exportTournament={() => {
          const tournament = controller.snapshot();
          setDraft(
            encodeTournament({
              tournament,
              setup: tournament
                ? null
                : {
                    ...setup,
                    names: setup.names.map(normalizePlayerName),
                  },
            }),
          );
          report('Exported tournament.');
        }}
      />
      <p id="tournament-notice">{notice}</p>
      {!tournament && (
        <History
          items={history.items}
          blocked={history.blocked}
          view={(event) => controller.install(event, true)}
        />
      )}
      {pending && (
        <LeaveDialog
          keepPlaying={() => setPending(null)}
          leave={() => {
            setPending(null);
            pending();
          }}
        />
      )}
    </section>
  );
}
