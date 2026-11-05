import { boardCode } from '../deck.ts';
import {
  createTournament,
  finishTournamentTurn,
  startTournamentTurn,
  advanceTournament,
} from './tournament.ts';
import type { TournamentProgress } from './tournament.ts';

export function exampleTournament(count = 4): TournamentProgress {
  return createTournament(
    Array.from({ length: count }, (_, index) => `Player ${index + 1}`),
    Array.from({ length: count - 1 }, (_, index) => boardCode(4, index + 1)),
    `example-${count}`,
    1_767_225_600_000,
  );
}

export function finishExampleTurn(
  progress: TournamentProgress,
  moves = 8,
  elapsedMs = 1000,
): TournamentProgress {
  const playing = startTournamentTurn(progress);
  if (!playing.game) throw new Error('Expected a playing turn.');
  return finishTournamentTurn(playing, {
    ...playing.game,
    moves,
    elapsedMs,
    matched: playing.game.deck.map((_, index) => index),
  });
}

export function finishExampleTournament(count = 4): TournamentProgress {
  let progress = exampleTournament(count);
  for (let index = 0; index < count - 1; index++) {
    progress = finishExampleTurn(progress, 9, 1000);
    progress = advanceTournament(progress, boardCode(4, 100));
    progress = finishExampleTurn(progress, 8, 2000);
    if (progress.phase !== 'complete') progress = advanceTournament(progress, boardCode(4, 100));
  }
  return progress;
}
