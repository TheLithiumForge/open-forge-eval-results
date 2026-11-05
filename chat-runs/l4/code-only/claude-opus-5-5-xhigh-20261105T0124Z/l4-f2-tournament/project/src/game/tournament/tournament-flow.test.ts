import assert from 'node:assert/strict';
import { test } from 'vitest';
import { activateCard, advanceGame, createGame, isWon } from '../game.ts';
import { EXAMPLE_CODE, EXAMPLE_PAIRS } from '../game.fixture.ts';
import { champion, nextTurn } from './bracket.ts';
import { decodeTournament, encodeTournament, TournamentStage } from './tournament-format.ts';
import {
  advance,
  beginTurn,
  draftNames,
  editDraft,
  finishTurn,
  loadFlow,
  savedFlow,
  setupFlow,
  startTournament,
} from './tournament-flow.ts';
import type { GameState } from '../game.ts';
import type { TournamentFlow } from './tournament-flow.ts';

const CODES = [EXAMPLE_CODE, EXAMPLE_CODE, EXAMPLE_CODE];

function named(names: readonly string[]): TournamentFlow {
  return names.reduce((flow, name, index) => editDraft(flow, index, name), setupFlow());
}

// Finds every pair after the given number of misses, with each move taking a second.
function won(game: GameState, misses: number): GameState {
  let state = game;
  for (let miss = 0; miss < misses; miss += 1)
    state = advanceGame(activateCard(activateCard(state, 0), 1), 1000);
  for (const index of EXAMPLE_PAIRS.flat()) state = activateCard(advanceGame(state, 500), index);
  assert.equal(isWon(state), true);
  return state;
}

function playTurn(flow: TournamentFlow, misses: number): TournamentFlow {
  const playing = beginTurn(flow);
  assert.equal(playing.phase, TournamentStage.playing);
  assert.ok(playing.progress);
  return finishTurn(playing, won(playing.progress, misses));
}

test('drafts keep every slot, trim names and export as a setup stage', () => {
  const flow = { ...named([' Ann ', 'Ben', 'Cy', 'Di', 'Ed']), count: 4 };
  assert.deepEqual(draftNames(flow), ['Ann', 'Ben', 'Cy', 'Di']);
  assert.equal(flow.draft[4], 'Ed');
  const saved = savedFlow(flow, null);
  assert.deepEqual(saved, {
    players: [' Ann ', 'Ben', 'Cy', 'Di'],
    matches: [],
    stage: TournamentStage.setup,
    game: null,
  });
  const restored = loadFlow({ ...setupFlow(), count: 8 }, saved);
  assert.equal(restored.count, 4);
  assert.deepEqual(restored.draft.slice(0, 4), saved.players);
});

test('a four-player tournament runs ready, playing and ended turns to a champion', () => {
  let flow = startTournament(named(['Ann', 'Ben', 'Cy', 'Di']), CODES);
  assert.equal(flow.phase, TournamentStage.ready);
  assert.equal(advance(flow), flow);
  assert.equal(finishTurn(flow, createGame(EXAMPLE_CODE)), flow);
  for (const misses of [0, 1, 3, 2, 1]) {
    flow = playTurn(flow, misses);
    assert.equal(flow.phase, TournamentStage.ended);
    assert.equal(flow.board, true);
    assert.equal(beginTurn(flow), flow);
    flow = advance(flow);
    assert.equal(flow.progress, null);
    assert.equal(flow.board, false);
  }
  flow = playTurn(flow, 0);
  assert.ok(flow.tournament);
  assert.equal(nextTurn(flow.tournament), null);
  assert.equal(advance(flow), flow);
  assert.equal(champion(flow.tournament), 3);
  assert.deepEqual(flow.tournament.matches[0]?.results, [
    { moves: 8, elapsedMs: 7500 },
    { moves: 9, elapsedMs: 9000 },
  ]);
  assert.equal(flow.turn, 6);
});

test('export and load keep each stage and a loaded turn resumes at Start turn', () => {
  const ready = startTournament(named(['Ann', 'Ben', 'Cy', 'Di']), CODES);
  const playing = beginTurn(ready);
  const live = activateCard(createGame(EXAMPLE_CODE), 3);
  const exported = decodeTournament(encodeTournament(savedFlow(playing, live)));
  assert.ok(exported);
  assert.equal(exported.stage, TournamentStage.playing);
  assert.deepEqual(exported.game, live);
  const loaded = loadFlow(setupFlow(), exported);
  assert.equal(loaded.phase, TournamentStage.ready);
  assert.deepEqual(savedFlow(loaded, null), exported);
  const resumed = beginTurn(loaded);
  assert.deepEqual(resumed.progress, live);
  assert.equal(savedFlow(ready, null).stage, TournamentStage.ready);
  const ended = playTurn(ready, 0);
  const endedText = encodeTournament(savedFlow(ended, null));
  const reloaded = decodeTournament(endedText);
  assert.ok(reloaded);
  const restored = loadFlow(playing, reloaded);
  assert.equal(restored.phase, TournamentStage.ended);
  assert.equal(restored.board, false);
  assert.equal(advance(restored).phase, TournamentStage.ready);
});
