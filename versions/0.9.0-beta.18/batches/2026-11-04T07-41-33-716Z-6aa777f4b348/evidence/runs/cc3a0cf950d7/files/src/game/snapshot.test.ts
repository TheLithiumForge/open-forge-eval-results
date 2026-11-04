import { expect, it } from 'vitest';
import { decodeSnapshot, encodeSnapshot } from './snapshot.ts';
import { activateCard, advanceGame, createGame } from './state.ts';

const example = { version: 1, boardCode: 'np1-4-1', matched: [0, 11],
  selection: { kind: 'mismatch', first: 1, second: 2, remainingMs: 300 },
  moves: 2, elapsedMs: 1500, started: true };
const decode = (data: unknown) => decodeSnapshot(JSON.stringify(data));

it('round trips the documented mismatch snapshot', () => {
  const game = decode(example);
  if (!game) throw new Error('Reference must load');
  expect(decodeSnapshot(encodeSnapshot(game))).toEqual(game);
  expect(advanceGame(game, 299).selection.kind).toBe('mismatch');
  expect(advanceGame(game, 300).selection.kind).toBe('closed');
});

it('round trips fresh, one-card and completed games', () => {
  const initial = createGame('np1-4-1');
  if (!initial) throw new Error('Invalid deal');
  expect(decodeSnapshot(encodeSnapshot(initial))).toEqual(initial);
  let game = activateCard(initial, 0);
  expect(decodeSnapshot(encodeSnapshot(game))).toEqual(game);
  game = initial;
  for (let face = 0; face < 8; face++) game = activateCard(activateCard(game, game.deck.indexOf(face)), game.deck.lastIndexOf(face));
  expect(decodeSnapshot(encodeSnapshot(game))).toEqual(game);
});

it.each([
  { extra: 1 }, { version: 2 }, { boardCode: 'np1-04-1' }, { matched: [0] },
  { matched: [0, 0] }, { matched: [0, 1] }, { matched: [0, 16] },
  { moves: 1 }, { moves: 1000000 }, { moves: 1.5 }, { elapsedMs: 360000000 },
  { elapsedMs: -1 }, { started: false }, { started: 'true' },
  { selection: { kind: 'closed', index: 1 } },
  { selection: { kind: 'one', index: 0 } },
  { selection: { kind: 'one', index: 16 } },
  { selection: { kind: 'mismatch', first: 1, second: 1, remainingMs: 300 } },
  { selection: { kind: 'mismatch', first: 4, second: 5, remainingMs: 300 } },
  { selection: { kind: 'mismatch', first: 1, second: 2, remainingMs: 0 } },
  { selection: { kind: 'mismatch', first: 1, second: 2, remainingMs: 801 } },
  { selection: { kind: 'mismatch', first: 1, second: 2, remainingMs: 1.5 } },
])('rejects inconsistent snapshot overrides %j', override => {
  expect(decode({ ...example, ...override })).toBeNull();
});

it('enforces initial and started state invariants', () => {
  const fresh = { ...example, matched: [], selection: { kind: 'closed' }, moves: 0, elapsedMs: 0, started: false };
  expect(decode(fresh)).not.toBeNull();
  expect(decode({ ...fresh, selection: { kind: 'one', index: 1 } })).toBeNull();
  expect(decode({ ...fresh, started: true })).toBeNull();
  expect(decode({ ...fresh, started: true, selection: { kind: 'one', index: 1 } })).not.toBeNull();
});

it('rejects malformed, oversized and unknown data', () => {
  for (const text of ['{', 'null', '[]', '"text"', JSON.stringify(example) + ' '.repeat(65536),
    JSON.stringify(example) + '\u2000'.repeat(22000)]) expect(decodeSnapshot(text)).toBeNull();
});
