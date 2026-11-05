import { BoardHelp } from '../board/BoardHelp.tsx';
import { GameStatus } from '../status/GameStatus.tsx';
import { TournamentSetup } from './TournamentSetup.tsx';
import { matchRound } from './bracket.ts';
import { isFinished, matchSeeds, playerName } from './rules.ts';
import { roundText, TournamentControl } from './tournament-labels.ts';
import { TurnPhase } from './use-tournament.ts';
import type { GameState } from '../game.ts';
import type { TournamentController } from './use-tournament.ts';
import './tournament.css';

interface TournamentHeaderProps {
  screen: TournamentController;
  game: GameState;
  celebration: boolean;
}

// The part of the Tournament screen above the live region: its heading, then the setup form or
// the current round and match. The round shows only while it is being played.
export function TournamentHeader({ screen, game, celebration }: TournamentHeaderProps) {
  const { tournament, match } = screen;
  const seeds = tournament && !isFinished(tournament) ? matchSeeds(tournament, match) : null;
  const playing = tournament !== null && screen.phase !== TurnPhase.ready;
  return (
    <>
      <h2 ref={screen.refs.heading} tabIndex={-1} className="tournament-heading">
        {TournamentControl.heading}
      </h2>
      {!tournament && <TournamentSetup setup={screen.setup} start={screen.start} />}
      {tournament && seeds && (
        <div className="tournament-context">
          <p className="tournament-round">
            {roundText(matchRound(tournament.players.length, match))}
          </p>
          <p>{seeds.map((seed) => playerName(tournament, seed)).join(' vs ')}</p>
        </div>
      )}
      {playing && (
        <GameStatus game={game} best={undefined} showBest={false} celebration={celebration} />
      )}
      {playing && <BoardHelp />}
    </>
  );
}
