import assert from 'node:assert/strict';
import { test } from 'vitest';
import { fourPlayers, turn } from './tournament.fixture.ts';
import { TurnPhase, turnView } from './view.ts';

test('before a tournament starts there is no turn owner or round', () => {
  assert.deepEqual(turnView(undefined, false, false), {
    phase: TurnPhase.setup,
    owner: '',
    round: '',
    match: undefined,
    second: false,
  });
});

test('a turn waits for Start turn, then plays, then ends on the same player', () => {
  const start = fourPlayers();
  const ready = turnView(start, false, false);
  assert.deepEqual(
    [ready.phase, ready.owner, ready.round],
    ['ready', 'Now playing: Ada', 'Round: Semifinal'],
  );
  assert.equal(turnView(start, true, false).phase, TurnPhase.playing);
  const after = fourPlayers([turn(20)]);
  const done = turnView(after, true, true);
  assert.deepEqual([done.phase, done.owner, done.second], ['done', 'Now playing: Ada', false]);
  const next = turnView(after, false, false);
  assert.deepEqual([next.phase, next.owner], ['ready', 'Now playing: Dev']);
});

test('the second player of a match ends on the offer of the next match', () => {
  const view = turnView(fourPlayers([turn(20), turn(22)]), true, true);
  assert.deepEqual([view.phase, view.owner, view.second], ['done', 'Now playing: Dev', true]);
  const later = turnView(fourPlayers([turn(20), turn(22)]), false, false);
  assert.deepEqual([later.owner, later.round], ['Now playing: Bo', 'Round: Semifinal']);
});

test('the final is named once the semifinals are done', () => {
  const view = turnView(fourPlayers([turn(20), turn(22), turn(21), turn(19)]), false, false);
  assert.deepEqual([view.owner, view.round], ['Now playing: Ada', 'Round: Final']);
});

test('a finished tournament names its champion and no round', () => {
  const view = turnView(
    fourPlayers([turn(20), turn(22), turn(21), turn(19), turn(40), turn(41)]),
    true,
    true,
  );
  assert.deepEqual([view.phase, view.owner, view.round], ['complete', 'Champion: Ada', '']);
});
