import assert from 'node:assert/strict';
import { test } from 'vitest';
import {
  isAhead,
  boardSize,
  championOf,
  drawBoardCodes,
  feedersOf,
  isFinished,
  matchLabel,
  matchPlayers,
  openingPairs,
  recordedTurns,
  resultOf,
  roundOf,
  turnAt,
  winnerOf,
} from './rules.ts';
import { EIGHT, FOUR, eightPlayers, fourPlayers, turn } from './tournament.fixture.ts';

function names(players: readonly (number | undefined)[], entries: readonly string[]) {
  return players.map((player) => (player === undefined ? undefined : entries[player]));
}

test('eight entrants open as 1 against 8, 4 against 5, 3 against 6, then 2 against 7', () => {
  const tournament = eightPlayers();
  assert.deepEqual(
    [0, 1, 2, 3].map((match) => names(matchPlayers(tournament, match), EIGHT)),
    [
      ['Ada', 'Hal'],
      ['Dev', 'Emi'],
      ['Cora', 'Finn'],
      ['Bo', 'Gia'],
    ],
  );
});

test('four entrants open as 1 against 4, then 2 against 3', () => {
  assert.deepEqual(
    [0, 1].map((match) => names(matchPlayers(fourPlayers(), match), FOUR)),
    [
      ['Ada', 'Dev'],
      ['Bo', 'Cora'],
    ],
  );
  assert.equal(openingPairs(4).length, 2);
  assert.equal(openingPairs(8).length, 4);
});

test('rounds are named by stage and a bracket of four has no quarterfinal', () => {
  assert.deepEqual(
    [0, 1, 2, 3, 4, 5, 6].map((match) => roundOf(8, match)),
    [
      'Quarterfinal',
      'Quarterfinal',
      'Quarterfinal',
      'Quarterfinal',
      'Semifinal',
      'Semifinal',
      'Final',
    ],
  );
  assert.deepEqual(
    [0, 1, 2].map((match) => roundOf(4, match)),
    ['Semifinal', 'Semifinal', 'Final'],
  );
});

test('boards grow by stage from 4x4 to 6x6 to 8x8', () => {
  assert.deepEqual((['Quarterfinal', 'Semifinal', 'Final'] as const).map(boardSize), [4, 6, 8]);
});

test('match labels number the matches within their round', () => {
  assert.deepEqual(
    [0, 1, 2, 3, 4, 5, 6].map((match) => matchLabel(8, match)),
    [
      'Quarterfinal 1',
      'Quarterfinal 2',
      'Quarterfinal 3',
      'Quarterfinal 4',
      'Semifinal 1',
      'Semifinal 2',
      'Final',
    ],
  );
  assert.deepEqual(
    [0, 1, 2].map((match) => matchLabel(4, match)),
    ['Semifinal 1', 'Semifinal 2', 'Final'],
  );
});

test('later matches take the winners of the two matches before them', () => {
  assert.deepEqual(
    [0, 4, 5, 6].map((match) => feedersOf(8, match)),
    [undefined, [0, 1], [2, 3], [4, 5]],
  );
  assert.deepEqual(feedersOf(4, 2), [0, 1]);
});

test('fewer moves win even when the other player was faster', () => {
  assert.equal(isAhead(turn(12, 70_200), 0, turn(13, 58_100), 1), true);
  assert.equal(isAhead(turn(13, 58_100), 1, turn(12, 70_200), 0), false);
});

test('equal moves go to the lower active time even when the display matches', () => {
  // 65200ms and 65900ms both show as 1:05, but the stored times differ.
  assert.equal(isAhead(turn(15, 65_200), 2, turn(15, 65_900), 3), true);
  assert.equal(isAhead(turn(15, 65_900), 3, turn(15, 65_200), 2), false);
});

test('equal moves and time go to the higher seed', () => {
  assert.equal(isAhead(turn(15, 65_200), 0, turn(15, 65_200), 7), true);
  assert.equal(isAhead(turn(15, 65_200), 7, turn(15, 65_200), 0), false);
});

test('a tied match is won by the higher seed whichever player went first', () => {
  const tied = eightPlayers([turn(10), turn(10)]);
  assert.equal(EIGHT[winnerOf(tied, 0) ?? -1], 'Ada');
  const lowerFirst = fourPlayers([turn(9), turn(9)]);
  assert.equal(FOUR[winnerOf(lowerFirst, 0) ?? -1], 'Ada');
});

test('a winner appears only once both players have a result', () => {
  assert.equal(winnerOf(fourPlayers([turn(9)]), 0), undefined);
  assert.equal(winnerOf(fourPlayers([turn(9), turn(10)]), 0), 0);
});

test('winners advance until the final names a champion', () => {
  const semifinals = fourPlayers([turn(9), turn(10), turn(11), turn(8)]);
  assert.deepEqual(names(matchPlayers(semifinals, 2), FOUR), ['Ada', 'Cora']);
  assert.equal(isFinished(semifinals), false);
  const done = fourPlayers([turn(9), turn(10), turn(11), turn(8), turn(20), turn(19)]);
  assert.equal(isFinished(done), true);
  assert.equal(FOUR[championOf(done) ?? -1], 'Cora');
});

test('an eight player bracket plays seven matches in order to a champion', () => {
  const results = [
    // Quarterfinals: Ada, Dev, Finn and Bo win.
    turn(8),
    turn(9),
    turn(8),
    turn(9),
    turn(9),
    turn(8),
    turn(8),
    turn(9),
    // Semifinals: Ada then Bo, using seeds for the second.
    turn(18),
    turn(20),
    turn(19),
    turn(19),
    // Final.
    turn(40),
    turn(41),
  ];
  const done = eightPlayers(results);
  assert.equal(recordedTurns(done), 14);
  assert.deepEqual(names(matchPlayers(done, 4), EIGHT), ['Ada', 'Dev']);
  assert.deepEqual(names(matchPlayers(done, 5), EIGHT), ['Finn', 'Bo']);
  assert.equal(EIGHT[championOf(done) ?? -1], 'Ada');
});

test('turns run in play order and wait for the players to be known', () => {
  const tournament = fourPlayers([turn(9)]);
  assert.deepEqual(turnAt(tournament, 0), { match: 0, second: false, player: 0 });
  assert.deepEqual(turnAt(tournament, 1), { match: 0, second: true, player: 3 });
  assert.equal(turnAt(tournament, 4), undefined);
});

test('a result keeps whole milliseconds', () => {
  assert.deepEqual(resultOf({ moves: 11, elapsedMs: 1500.75 }), { moves: 11, elapsedMs: 1500 });
});

test('every match gets a different board code at its round size', () => {
  const answers = ['np1-6-5', 'np1-6-5', 'np1-6-6', 'np1-8-5'];
  const sizes: number[] = [];
  const codes = drawBoardCodes(4, (size) => {
    sizes.push(size);
    return answers.shift() ?? 'np1-8-9';
  });
  assert.deepEqual(codes, ['np1-6-5', 'np1-6-6', 'np1-8-5']);
  assert.deepEqual(sizes, [6, 6, 6, 8]);
});

test('drawing gives up when the same code keeps coming back', () => {
  assert.throws(() => drawBoardCodes(4, () => 'np1-6-5'));
});
