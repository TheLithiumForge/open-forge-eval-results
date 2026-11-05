import { useLayoutEffect, useRef, useState } from 'react';
import { TournamentExchange } from './TournamentExchange.tsx';
import { LeaveTournamentDialog } from './LeaveTournamentDialog.tsx';
import { TournamentPast } from './TournamentPast.tsx';
import { TournamentPlay } from './TournamentPlay.tsx';
import { TournamentSetup } from './TournamentSetup.tsx';
import { decodeTournament, encodeTournament } from './format.ts';
import type { Tournament } from './types.ts';
import './tournament.css';

interface TournamentScreenProps {
  tournament: Tournament | null;
  past: readonly Tournament[];
  storageBlocked: boolean;
  notice: string;
  start(names: readonly string[]): void;
  startTurn(): void;
  activate(index: number): void;
  nextTurn(): void;
  nextMatch(): void;
  leave(): void;
  load(text: string): boolean;
  exportData(): string;
  setNotice(message: string): void;
  onBack(): void;
}

export function TournamentScreen(props: TournamentScreenProps) {
  const heading = useRef<HTMLHeadingElement>(null);
  const [dialog, setDialog] = useState<'leave' | 'load' | null>(null);
  const [pendingText, setPendingText] = useState('');
  useLayoutEffect(() => heading.current?.focus(), []);
  const champion = props.tournament?.champion;

  function requestLoad(text: string): boolean {
    const candidate = decodeTournament(text);
    if (!candidate) return props.load(text);
    if (
      props.tournament &&
      !props.tournament.champion &&
      encodeTournament(candidate) !== encodeTournament(props.tournament)
    ) {
      setPendingText(text);
      setDialog('load');
      return false;
    }
    return props.load(text);
  }

  function confirm(): void {
    if (dialog === 'leave') {
      props.leave();
      props.onBack();
    } else if (dialog === 'load') {
      props.load(pendingText);
      setPendingText('');
      setDialog(null);
    }
  }

  function cancel(): void {
    setPendingText('');
    setDialog(null);
  }

  return (
    <section className="tournament-screen" aria-labelledby="tournament-heading">
      <h2 id="tournament-heading" ref={heading} tabIndex={-1}>
        Tournament
      </h2>
      {props.notice && (
        <p className="tournament-notice" role="status" aria-live="polite">
          {props.notice}
        </p>
      )}
      {!props.tournament && <TournamentSetup start={props.start} setNotice={props.setNotice} />}
      {props.tournament && !champion && (
        <TournamentPlay
          tournament={props.tournament}
          activate={props.activate}
          startTurn={props.startTurn}
          nextTurn={props.nextTurn}
          nextMatch={props.nextMatch}
          leave={() => setDialog('leave')}
        />
      )}
      {props.tournament && champion && (
        <section className="tournament-complete" aria-labelledby="tournament-champion-heading">
          <h3 id="tournament-champion-heading" className="tournament-champion">
            Champion: {champion.name}
          </h3>
          <TournamentPlay
            tournament={props.tournament}
            activate={props.activate}
            startTurn={props.startTurn}
            nextTurn={props.nextTurn}
            nextMatch={props.nextMatch}
            leave={props.leave}
          />
          <button type="button" className="control" onClick={props.onBack}>
            Back to game
          </button>
        </section>
      )}
      {!props.tournament && (
        <button type="button" className="control" onClick={props.onBack}>
          Back to game
        </button>
      )}
      <TournamentExchange exportData={props.exportData} load={requestLoad} />
      <TournamentPast tournaments={props.past} storageBlocked={props.storageBlocked} />
      <LeaveTournamentDialog
        open={dialog !== null}
        loading={dialog === 'load'}
        confirm={confirm}
        cancel={cancel}
      />
    </section>
  );
}
