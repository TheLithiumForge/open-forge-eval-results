import { BoardHelp } from '../board/BoardHelp.tsx';
import { GameStatus } from '../status/GameStatus.tsx';
import { champion, lastTurn, matchLabel, nextTurn, matchPlayers, roundName } from './rules.ts';
import {
  championText,
  roundText,
  TournamentControl,
  TournamentNotice,
} from './tournament-labels.ts';
import { TournamentSetup } from './TournamentSetup.tsx';
import { TournamentStep } from './use-tournament.ts';
import type { RefObject } from 'react';
import type { TournamentView } from './use-tournament.ts';
import '../controls/control.css';
import './tournament.css';

interface TournamentHeadProps {
  view: TournamentView;
  heading: RefObject<HTMLHeadingElement | null>;
  back(): void;
}

// The part of the screen above the status line: its heading, setup or the current match.
export function TournamentHead({ view, heading, back }: TournamentHeadProps) {
  const { step, tournament, play } = view;
  const { players } = tournament;
  const winner = champion(tournament);
  const turn = step === TournamentStep.review ? lastTurn(tournament) : nextTurn(tournament);
  const opponents = turn && matchPlayers(tournament, turn.match).map((p) => players[p ?? -1]);
  return (
    <>
      <h2 ref={heading} tabIndex={-1}>
        {winner === null ? TournamentControl.heading : championText(players[winner] ?? '')}
      </h2>
      {step === TournamentStep.setup && (
        <>
          <p className="intro">{TournamentNotice.intro}</p>
          <TournamentSetup start={view.start} back={back} />
        </>
      )}
      {turn && opponents && (
        <div className="match-summary">
          <p>{roundText(roundName(players.length, turn.match))}</p>
          <p className="match-line">
            {matchLabel(players.length, turn.match)}: {opponents.join(' against ')}
          </p>
        </div>
      )}
      {step === TournamentStep.finished && (
        <div className="tournament-actions">
          <button type="button" className="control" onClick={back}>
            {TournamentControl.back}
          </button>
        </div>
      )}
      {play && (
        <>
          <GameStatus game={play.game} celebration={play.celebration} />
          <BoardHelp />
        </>
      )}
    </>
  );
}
