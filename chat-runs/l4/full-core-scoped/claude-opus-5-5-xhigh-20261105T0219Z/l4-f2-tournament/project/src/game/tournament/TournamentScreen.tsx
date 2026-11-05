import { Board, BoardHelp } from '../board/Board.tsx';
import { GameStatus } from '../status/GameStatus.tsx';
import { Bracket } from './Bracket.tsx';
import { championText, roundText, TournamentControl, TournamentText } from './labels.ts';
import { PastTournaments } from './PastTournaments.tsx';
import { championOf, currentTurn, roundName } from './rules.ts';
import { TournamentSetup } from './TournamentSetup.tsx';
import { TournamentTools } from './TournamentTools.tsx';
import { TurnStage } from './use-tournament.ts';
import type { Session } from '../session/session.ts';
import type { Tournament } from './rules.ts';
import type { useTournament } from './use-tournament.ts';
import './tournament.css';

interface ScreenProps {
  controller: ReturnType<typeof useTournament>;
  session: Session;
}

// The match on screen: while a result shows, the match that result belongs to.
function shownMatch(tournament: Tournament, stage: string): number {
  const turn = currentTurn(tournament);
  if (!turn) return tournament.matches.length - 1;
  return stage === TurnStage.done && turn.slot === 0 ? turn.match - 1 : turn.match;
}

// Everything above the game's status line: the heading, then setup or the current round.
export function TournamentHeader({ controller, session }: ScreenProps) {
  const { tournament, stage, invalidEntry } = controller.state;
  const finished = tournament !== null && championOf(tournament) !== null;
  return (
    <>
      <h2 ref={controller.focus.tournamentHeading} tabIndex={-1}>
        {TournamentText.heading}
      </h2>
      {tournament === null ? (
        <>
          <p className="intro">{TournamentText.intro}</p>
          <TournamentSetup
            invalidEntry={invalidEntry}
            start={controller.start}
            back={controller.close}
          />
        </>
      ) : (
        <>
          {!finished && (
            <p className="round">
              {roundText(roundName(tournament.players.length, shownMatch(tournament, stage)))}
            </p>
          )}
          {stage !== TurnStage.ready && (
            <GameStatus game={session.game} best={null} celebration={session.celebration} />
          )}
          {stage === TurnStage.playing && <BoardHelp />}
        </>
      )}
    </>
  );
}

function actionFor(controller: ScreenProps['controller'], tournament: Tournament) {
  const { stage } = controller.state;
  if (championOf(tournament) !== null)
    return { label: TournamentControl.back, run: controller.close };
  if (stage === TurnStage.ready)
    return { label: TournamentControl.startTurn, run: controller.startTurn };
  if (stage === TurnStage.playing) return null;
  const label =
    currentTurn(tournament)?.slot === 1 ? TournamentControl.nextTurn : TournamentControl.nextMatch;
  return { label, run: controller.nextTurn };
}

// Everything below the status line. The tools keep one place, so their draft and focus survive
// a start or a load.
export function TournamentBody({ controller, session }: ScreenProps) {
  const { tournament, stage, past } = controller.state;
  const champion = tournament && championOf(tournament);
  const action = tournament && actionFor(controller, tournament);
  return (
    <>
      {tournament && stage === TurnStage.playing && (
        <Board
          key={`board-${session.generation}`}
          game={session.game}
          activate={controller.activate}
          ref={controller.focus.board}
        />
      )}
      {tournament && champion !== null && (
        <p key="champion" className="champion">
          {championText(tournament.players[champion] ?? '')}
        </p>
      )}
      {tournament && (
        <div key="actions" className="tournament-row tournament-actions">
          {action && (
            <button
              ref={controller.focus.action}
              type="button"
              className="control"
              onClick={action.run}
            >
              {action.label}
            </button>
          )}
          {champion === null && (
            <button type="button" className="control" onClick={controller.leave}>
              {TournamentControl.leave}
            </button>
          )}
        </div>
      )}
      <TournamentTools
        key="tools"
        exportTournament={controller.exportTournament}
        load={controller.load}
      />
      {tournament ? (
        <Bracket key="bracket" tournament={tournament} />
      ) : (
        <PastTournaments key="past" past={past} />
      )}
    </>
  );
}
