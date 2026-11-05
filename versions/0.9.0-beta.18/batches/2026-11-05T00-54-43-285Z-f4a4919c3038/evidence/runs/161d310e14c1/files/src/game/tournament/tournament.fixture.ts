import assert from 'node:assert/strict';
import { boardCode } from '../deck.ts';
import { activateCard } from '../game.ts';
import { tournamentRound } from './pairing.ts';
import {
  finishTournamentTurn,
  nextTournamentTurn,
  startTournament,
  startTournamentTurn,
} from './rules.ts';
import { TournamentPhase } from './model.ts';
import type { TournamentState } from './model.ts';

export function exampleTournament(count = 4, seed = 1): TournamentState {
  const names = ['Ada', 'Bo', 'Cora', 'Dev', 'Emi', 'Finn', 'Gia', 'Hal'].slice(0, count);
  const state = startTournament(
    names,
    Array.from({ length: count - 1 }, (_, index) =>
      boardCode(tournamentRound(count, index).size, seed + index),
    ),
  );
  assert.ok(state);
  return state;
}

export function finishExampleTurn(
  state: TournamentState,
  extraMoves = 0,
  elapsedMs = 0,
): TournamentState {
  const playing = startTournamentTurn(state);
  let game = playing.game;
  assert.ok(game);
  const pairs = new Map<number, number[]>();
  game.deck.forEach((face, index) => pairs.set(face, [...(pairs.get(face) ?? []), index]));
  for (const pair of pairs.values()) for (const index of pair) game = activateCard(game, index);
  return finishTournamentTurn(playing, { ...game, moves: game.moves + extraMoves, elapsedMs });
}

export function finishedExampleTournament(count = 4, seed = 1): TournamentState {
  let state = exampleTournament(count, seed);
  while (state.phase !== TournamentPhase.complete) {
    state = finishExampleTurn(state);
    if (state.phase !== TournamentPhase.complete) state = nextTournamentTurn(state);
  }
  return state;
}
