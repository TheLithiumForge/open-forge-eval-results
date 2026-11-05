import { bracketRounds, lastTurn, matchPlayers, nextTurn, turnPlayer } from './bracket.ts';
import { Bracket } from './Bracket.tsx';
import { TournamentStage } from './tournament-format.ts';
import { matchDetail, nowPlaying, roundName, TournamentControl } from './tournament-labels.ts';
import { TurnGame } from './TurnGame.tsx';
import type { RefObject } from 'react';
import type { GameState } from '../game.ts';
import type { Tournament } from './bracket.ts';
import type { TournamentFlow } from './tournament-flow.ts';
import type { TurnProgress } from './TurnGame.tsx';

interface TournamentPlayProps {
  flow: TournamentFlow;
  tournament: Tournament;
  focusTarget(element: HTMLElement | null): void;
  turnGame: RefObject<TurnProgress | null>;
  startTurn(): void;
  finish(game: GameState): void;
  nextStep(): void;
  leave(): void;
}

function roundOf(tournament: Tournament, match: number): string {
  const rounds = bracketRounds(tournament.players.length);
  const round = rounds.findIndex((matches) => matches.includes(match));
  return roundName(rounds.length - round);
}

// One match at a time. An ended turn keeps its player and board until Next turn or Next match.
export function TournamentPlay({
  flow,
  tournament,
  focusTarget,
  turnGame,
  startTurn,
  finish,
  nextStep,
  leave,
}: TournamentPlayProps) {
  const ended = flow.phase === TournamentStage.ended;
  const turn = ended ? lastTurn(tournament) : nextTurn(tournament);
  const following = nextTurn(tournament);
  if (!turn) return null;
  const name = (player: number | null) =>
    player === null ? '' : (tournament.players[player] ?? '');
  const [first, second] = matchPlayers(tournament, turn.match);
  const showGame = flow.phase === TournamentStage.playing || (ended && flow.board);
  return (
    <>
      <section className="tournament-turn" aria-labelledby="now-playing">
        <h3 id="now-playing">{nowPlaying(name(turnPlayer(tournament, turn)))}</h3>
        <p className="help">
          {matchDetail(roundOf(tournament, turn.match), turn.match, name(first), name(second))}
        </p>
        <div className="tournament-actions">
          {flow.phase === TournamentStage.ready && (
            <button type="button" className="control" ref={focusTarget} onClick={startTurn}>
              {TournamentControl.startTurn}
            </button>
          )}
          {ended && following && (
            <button type="button" className="control" ref={focusTarget} onClick={nextStep}>
              {following.seat === 1 ? TournamentControl.nextTurn : TournamentControl.nextMatch}
            </button>
          )}
          <button type="button" className="control" onClick={leave}>
            {TournamentControl.leave}
          </button>
        </div>
      </section>
      {showGame && flow.progress && (
        <TurnGame key={flow.turn} initial={flow.progress} finish={finish} ref={turnGame} />
      )}
      <Bracket tournament={tournament} />
    </>
  );
}
