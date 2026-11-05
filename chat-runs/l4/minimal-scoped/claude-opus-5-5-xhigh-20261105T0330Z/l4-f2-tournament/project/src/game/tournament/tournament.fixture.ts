import { boardCode } from '../deck.ts';
import { createTournament, currentTurn, recordResult } from './rules.ts';
import type { Attempt, Tournament } from './rules.ts';

export const FOUR = ['Ada', 'Bo', 'Cora', 'Dev'] as const;
export const EIGHT = ['Ada', 'Bo', 'Cora', 'Dev', 'Emi', 'Finn', 'Gia', 'Hal'] as const;

// Deals seeds 1, 2, 3 and so on, so a test can predict every board code.
export function countingDraw(): (size: number) => string {
  let seed = 0;
  return (size) => boardCode(size, (seed += 1));
}

// Plays every remaining turn with the attempt the callback gives for that player.
export function playAll(
  tournament: Tournament,
  attempt: (player: string) => Attempt,
  draw = countingDraw(),
): Tournament {
  let played = tournament;
  for (let turn = currentTurn(played); turn; turn = currentTurn(played)) {
    const match = played.rounds[turn.round]?.[turn.match];
    const player = played.players[match?.players[turn.player] ?? -1] ?? '';
    played = recordResult(played, attempt(player), draw);
  }
  return played;
}

// A finished tournament where earlier entries always win with fewer moves.
export function finishedTournament(players: readonly string[] = FOUR): Tournament {
  return playAll(createTournament(players, countingDraw()), (player) => ({
    moves: 40 + players.indexOf(player),
    elapsedMs: 1000.5,
  }));
}
