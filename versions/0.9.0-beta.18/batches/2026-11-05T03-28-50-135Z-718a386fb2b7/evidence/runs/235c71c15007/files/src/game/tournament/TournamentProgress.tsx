import { useLayoutEffect, useRef } from 'react';
import { TournamentBracket } from './TournamentBracket.tsx';
import { TournamentTurn } from './TournamentTurn.tsx';
import type { TournamentController } from './use-tournament.ts';

interface TournamentProgressProps {
  readonly controller: TournamentController;
}

export function TournamentProgress({ controller }: TournamentProgressProps) {
  const { current, match, player, tournament } = controller;
  const action = useRef<HTMLButtonElement>(null);
  const previousAction = useRef<string | null>(null);
  useLayoutEffect(() => {
    if (controller.actionLabel === 'Start turn' && previousAction.current !== 'Start turn')
      action.current?.focus();
    previousAction.current = controller.actionLabel;
  }, [controller.actionLabel]);
  if (tournament?.status !== 'active' || !current || !match || !player) return null;
  return (
    <section className="tournament-play" aria-labelledby="tournament-play-title">
      <h3 id="tournament-play-title">Tournament match</h3>
      <p className="tournament-round">Round: {tournament.rounds[current.round]?.name}</p>
      <div className="tournament-action-row">
        {controller.actionLabel && (
          <button ref={action} className="control" type="button" onClick={controller.turnAction}>
            {controller.actionLabel}
          </button>
        )}
        <button className="control" type="button" onClick={controller.requestLeave}>Leave tournament</button>
      </div>
      {controller.turnStarted && (
        <TournamentTurn
          key={`${controller.activeTurnKey}-${controller.gameSnapshot ?? 'fresh'}`}
          ref={controller.turn}
          autoFocusBoard={controller.autoFocusBoard}
          boardCode={match.boardCode}
          initialSnapshot={controller.gameSnapshot}
          onBoardFocused={controller.onBoardFocused}
          onComplete={controller.onComplete}
          onFeedback={controller.onFeedback}
          player={player}
        />
      )}
      <TournamentBracket current={current} rounds={tournament.rounds} />
    </section>
  );
}
