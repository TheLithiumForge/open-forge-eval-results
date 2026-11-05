import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { browserStore } from '../session/use-saved-preferences.ts';
import { useTournament } from '../session/use-tournament.ts';
import { Bracket } from './Bracket.tsx';
import { Exchange } from './Exchange.tsx';
import { LeaveDialog } from './LeaveDialog.tsx';
import { Setup } from './Setup.tsx';
import { TournamentPlay } from './TournamentPlay.tsx';
import { encodeTournament, decodeTournament } from './format.ts';
import { readTournaments, saveTournament } from './history.ts';
import { matchPlayers, matchWinner } from './rules.ts';
import { TournamentPhase } from './model.ts';
import type { TournamentState } from './model.ts';
import './tournament.css';

interface TournamentProps {
  back(): void;
  publish(message: string, player?: string): void;
}

export function Tournament({ back, publish }: TournamentProps) {
  const controller = useTournament();
  const { tournament: state, session } = controller;
  const [names, setNames] = useState<readonly string[]>(['', '', '', '']);
  const [error, setError] = useState('');
  const [store] = useState(browserStore);
  const [history, setHistory] = useState(() => readTournaments(store));
  const [pending, setPending] = useState<(() => void) | null>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const saved = useRef<TournamentState | null>(null);
  const phase = state?.phase;
  const matchIndex = state?.matchIndex;
  const turn = state?.turn;
  const playerSeed =
    state && phase !== TournamentPhase.complete
      ? matchPlayers(state, state.matchIndex)[state.turn]
      : null;
  const player = state && playerSeed !== null ? (state.players[playerSeed - 1] ?? '') : '';
  useLayoutEffect(() => {
    heading.current?.focus();
  }, [phase, matchIndex, turn, session.generation, session.paused]);
  useEffect(() => {
    publish(session.feedback, player);
  }, [publish, session.feedback, session.announcement, player]);
  useEffect(() => {
    if (state?.phase !== TournamentPhase.complete || saved.current === state) return;
    saved.current = state;
    const next = saveTournament(store, history.items, state);
    setHistory({ ...next, blocked: history.blocked || next.blocked });
  }, [state, store, history]);

  function report(message: string): void {
    setError(message);
    publish(message);
  }
  function replace(action: () => void): void {
    if (state && state.phase !== TournamentPhase.complete) setPending(() => action);
    else action();
  }
  function load(text: string): void {
    const decoded = decodeTournament(text);
    const document = decoded.document;
    if (!document) {
      report(decoded.error);
      return;
    }
    replace(() => {
      setError('');
      if (document.setup) setNames(document.setup);
      controller.install(
        document.tournament,
        document.tournament?.phase === TournamentPhase.playing
          ? 'Loaded tournament. Select Start turn to continue.'
          : 'Loaded tournament.',
      );
    });
  }

  return (
    <section className="tournament-screen" aria-labelledby="tournament-heading">
      <h2 ref={heading} id="tournament-heading" tabIndex={-1}>
        Tournament
      </h2>
      {!state ? (
        <>
          <Setup
            names={names}
            change={setNames}
            error={error}
            publish={report}
            start={(players) => {
              setError('');
              controller.start(players);
            }}
          />
          <section className="past-tournaments" aria-labelledby="past-heading">
            <h3 id="past-heading">Past tournaments</h3>
            {history.blocked && <p>Progress won't be saved on this device.</p>}
            {history.items.length === 0 ? (
              <p>No finished tournaments yet.</p>
            ) : (
              <ol>
                {history.items.map((item, index) => (
                  <li key={index}>
                    <button
                      type="button"
                      className="control"
                      onClick={() => {
                        saved.current = item;
                        controller.install(item);
                      }}
                    >
                      {item.players.length} players · Champion:{' '}
                      {item.players[(matchWinner(item, item.matches.length - 1) ?? 1) - 1]}
                    </button>
                  </li>
                ))}
              </ol>
            )}
          </section>
          <button type="button" className="control" onClick={back}>
            Back to game
          </button>
        </>
      ) : (
        <>
          <TournamentPlay
            state={state}
            session={session}
            startTurn={controller.startTurn}
            nextTurn={controller.nextTurn}
            activate={controller.activate}
            leave={() => replace(back)}
            back={back}
            showHistory={() => controller.install(null)}
          />
          <Bracket tournament={state} />
          {history.blocked && <p>Progress won't be saved on this device.</p>}
        </>
      )}
      <Exchange
        exportTournament={() =>
          encodeTournament({
            setup: state ? null : names,
            tournament: controller.synchronizedTournament(),
          })
        }
        load={load}
      />
      {state && error && <p>{error}</p>}
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
