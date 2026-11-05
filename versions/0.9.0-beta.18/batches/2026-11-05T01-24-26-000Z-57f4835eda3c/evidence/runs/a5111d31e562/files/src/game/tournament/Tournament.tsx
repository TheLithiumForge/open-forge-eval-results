import { useLayoutEffect, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import { Bracket } from './Bracket.tsx';
import { LeaveDialog } from './LeaveDialog.tsx';
import { PastTournaments } from './PastTournaments.tsx';
import { TournamentPlay } from './TournamentPlay.tsx';
import { TournamentSetup } from './TournamentSetup.tsx';
import { TournamentTools } from './TournamentTools.tsx';
import { champion, roundNames } from './rules.ts';
import { TournamentControl, TournamentText } from './tournament-labels.ts';
import type { ReactNode } from 'react';
import type { TournamentFlow } from './use-tournament.ts';
import '../controls/control.css';
import './tournament.css';

interface TournamentProps {
  flow: TournamentFlow;
  // The page's one status region, owned by Game. It keeps its place on every tournament screen.
  result: ReactNode;
  close(): void;
}

// The Tournament screen replaces the solo game. Setup, each match and the champion are its screens,
// and each one's heading takes focus when it appears.
export function Tournament({ flow, result, close }: TournamentProps) {
  const heading = useRef<HTMLHeadingElement>(null);
  const startButton = useRef<HTMLButtonElement>(null);
  const [pending, setPending] = useState<(() => void) | null>(null);
  useLayoutEffect(() => {
    heading.current?.focus();
  }, [flow.screen]);
  const { tournament, shown } = flow;
  const winner = tournament && champion(tournament);
  const round = tournament && shown && roundNames(tournament.players.length)[shown.round];
  const title = !tournament
    ? TournamentText.title
    : winner !== null
      ? `${TournamentText.champion} ${tournament.players[winner] ?? ''}`
      : `${TournamentText.round} ${round ?? ''}`;

  function back(): void {
    flow.close();
    close();
  }

  // Leaving unfinished work asks first; otherwise the action runs at once.
  function confirm(action: () => void): void {
    if (flow.unfinished) setPending(() => action);
    else action();
  }

  function next(sameMatch: boolean): void {
    flushSync(flow.next);
    // A new match moves focus to its heading. The next turn of the same match starts here.
    if (sameMatch) startButton.current?.focus();
  }

  return (
    <section className="tournament" aria-labelledby="tournament-heading">
      <h2 id="tournament-heading" ref={heading} tabIndex={-1}>
        {title}
      </h2>
      {result}
      {!tournament ? (
        <TournamentSetup start={flow.start} back={back} />
      ) : winner !== null ? (
        <div className="tournament-actions">
          <button type="button" className="control" onClick={back}>
            {TournamentControl.back}
          </button>
        </div>
      ) : (
        <TournamentPlay
          flow={flow}
          startButton={startButton}
          next={next}
          leave={() => confirm(back)}
        />
      )}
      {tournament && <Bracket tournament={tournament} />}
      {(!tournament || winner !== null) && <PastTournaments saved={flow.saved} />}
      <TournamentTools
        exportTournament={flow.exportTournament}
        loadDraft={(text) => {
          const loaded = flow.readDraft(text);
          if (loaded) confirm(() => flow.load(loaded));
        }}
        notice={flow.notice}
      />
      <LeaveDialog
        open={pending !== null}
        keep={() => setPending(null)}
        leave={() => {
          setPending(null);
          pending?.();
        }}
      />
    </section>
  );
}
