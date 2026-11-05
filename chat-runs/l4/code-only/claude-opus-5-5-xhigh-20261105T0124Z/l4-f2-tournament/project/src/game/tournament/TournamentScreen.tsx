import { useEffect, useRef } from 'react';
import { Masthead } from '../Masthead.tsx';
import { champion } from './bracket.ts';
import { Bracket } from './Bracket.tsx';
import { championLine, TournamentControl } from './tournament-labels.ts';
import { TournamentPlay } from './TournamentPlay.tsx';
import { TournamentSetup } from './TournamentSetup.tsx';
import { TournamentTransfer } from './TournamentTransfer.tsx';
import { useTournament } from './use-tournament.ts';
import '../game.css';
import '../controls/control.css';
import './tournament.css';

interface TournamentScreenProps {
  // The grid size free play had selected. New tournaments deal boards of this size.
  size: number;
  leave(): void;
}

export function TournamentScreen({ size, leave }: TournamentScreenProps) {
  const controller = useTournament(size);
  const { flow, notice } = controller;
  const { tournament } = flow;
  const heading = useRef<HTMLHeadingElement>(null);
  // The screen opens from the Tournament button, so focus moves to its heading.
  useEffect(() => {
    heading.current?.focus();
  }, []);
  const winner = tournament ? champion(tournament) : null;
  let content;
  if (!tournament)
    content = (
      <TournamentSetup
        flow={flow}
        size={size}
        past={controller.past}
        chooseCount={controller.chooseCount}
        editName={controller.editName}
        start={controller.start}
        leave={leave}
      />
    );
  else if (winner !== null)
    content = (
      <>
        <section className="tournament-turn" aria-labelledby="champion">
          <h3 id="champion" ref={controller.focusTarget} tabIndex={-1}>
            {championLine(tournament.players[winner] ?? '')}
          </h3>
          <div className="tournament-actions">
            <button type="button" className="control" onClick={leave}>
              {TournamentControl.back}
            </button>
          </div>
        </section>
        <Bracket tournament={tournament} />
      </>
    );
  else
    content = (
      <TournamentPlay
        flow={flow}
        tournament={tournament}
        focusTarget={controller.focusTarget}
        turnGame={controller.turnGame}
        startTurn={controller.startTurn}
        finish={controller.finish}
        nextStep={controller.nextStep}
        leave={leave}
      />
    );
  return (
    <main className="tournament">
      <Masthead />
      <h2 ref={heading} tabIndex={-1}>
        {TournamentControl.heading}
      </h2>
      <p
        id="tournament-notice"
        className="tournament-notice"
        role="status"
        aria-live="polite"
        aria-atomic="true"
      >
        <span key={notice.announcement}>{notice.text}</span>
      </p>
      {content}
      <TournamentTransfer exportText={controller.exportText} load={controller.load} />
    </main>
  );
}
