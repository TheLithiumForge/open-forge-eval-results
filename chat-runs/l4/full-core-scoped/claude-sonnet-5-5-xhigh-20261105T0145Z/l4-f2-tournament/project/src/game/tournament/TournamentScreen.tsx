import { useRef, useState } from 'react';
import { Board } from '../board/Board.tsx';
import { BoardHelp } from '../board/BoardHelp.tsx';
import { GameResult } from '../status/GameResult.tsx';
import { GameStatus } from '../status/GameStatus.tsx';
import { Bracket } from './Bracket.tsx';
import { Exchange } from './Exchange.tsx';
import { LeaveDialog } from './LeaveDialog.tsx';
import { PastList } from './PastList.tsx';
import { SetupForm } from './SetupForm.tsx';
import { matchLine, roundOf } from './bracket.ts';
import { turnPlayer } from './rules.ts';
import { TournamentControl } from './tournament-labels.ts';
import { useTournament } from './use-tournament.ts';
import type { BoardFocus } from '../board/Board.tsx';
import type { PastTournaments } from './storage.ts';
import type { Tournament } from './rules.ts';
import type { View } from './turn.ts';
import '../controls/control.css';
import './tournament.css';

interface TournamentScreenProps {
  past: PastTournaments;
  save(finished: Tournament): void;
  close(): void;
}

const STATUS_ID = 'tournament-status';

// Each screen of the tournament has its own heading, which takes focus when the screen appears.
function focusHeading(heading: HTMLHeadingElement | null): void {
  heading?.focus();
}

function screenKey(view: View): string {
  if (view.kind === 'setup' || view.kind === 'finished') return view.kind;
  return `${view.kind === 'ready' ? 'ready' : 'play'}-${view.turn.match}-${view.turn.slot}`;
}

function headingText(view: View, tournament: Tournament | null): string {
  if (view.kind === 'setup') return 'Tournament';
  if (view.kind === 'finished') return 'Tournament complete';
  return `Round: ${tournament ? roundOf(tournament, view.turn.match) : ''}`;
}

export function TournamentScreen({ past, save, close }: TournamentScreenProps) {
  const state = useTournament(save);
  const { view, tournament, session, result } = state;
  const [confirming, setConfirming] = useState(false);
  const board = useRef<BoardFocus>(null);
  const owner =
    tournament && 'turn' in view
      ? tournament.players[turnPlayer(tournament, view.turn) ?? -1]
      : undefined;
  const hasBoard = view.kind === 'playing' || view.kind === 'turnDone' || view.kind === 'matchDone';
  const next = view.kind === 'turnDone' ? TournamentControl.nextTurn : TournamentControl.nextMatch;
  return (
    <div className="tournament">
      <h2 key={screenKey(view)} tabIndex={-1} ref={focusHeading}>
        {headingText(view, tournament)}
      </h2>
      {view.kind === 'setup' && (
        <SetupForm
          count={state.count}
          names={state.names}
          setCount={state.setCount}
          rename={state.rename}
          start={state.start}
          back={close}
          statusId={STATUS_ID}
        />
      )}
      {tournament && 'turn' in view && (
        <p className="match-line">{matchLine(tournament, view.turn.match)}</p>
      )}
      {tournament && view.kind === 'finished' && (
        <p className="champion">Champion: {tournament.players[view.champion]}</p>
      )}
      {hasBoard && (
        <GameStatus
          game={session.game}
          best={undefined}
          showBest={false}
          celebration={session.celebration}
        />
      )}
      {hasBoard && <BoardHelp />}
      <GameResult
        feedback={result.feedback}
        announcement={result.announcement}
        owner={owner}
        id={STATUS_ID}
      />
      {view.kind === 'setup' && <PastList past={past} />}
      {hasBoard && (
        <Board key={session.generation} game={session.game} activate={state.activate} ref={board} />
      )}
      {view.kind !== 'setup' && (
        <div className="tournament-actions">
          {view.kind === 'ready' && (
            <button type="button" className="control" onClick={state.startTurn}>
              {TournamentControl.startTurn}
            </button>
          )}
          {(view.kind === 'turnDone' || view.kind === 'matchDone') && (
            <button type="button" className="control" onClick={state.advance}>
              {next}
            </button>
          )}
          {view.kind === 'finished' ? (
            <button type="button" className="control" onClick={close}>
              {TournamentControl.back}
            </button>
          ) : (
            <button type="button" className="control" onClick={() => setConfirming(true)}>
              {TournamentControl.leave}
            </button>
          )}
        </div>
      )}
      {tournament && <Bracket tournament={tournament} />}
      <Exchange exportJson={state.exportJson} load={state.load} statusId={STATUS_ID} />
      {confirming && (
        <LeaveDialog
          keep={() => setConfirming(false)}
          leave={() => {
            setConfirming(false);
            state.leave();
          }}
        />
      )}
    </div>
  );
}
