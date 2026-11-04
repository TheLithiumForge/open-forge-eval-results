import { describe, expect, it } from 'vitest';
import { decodeSnapshot, encodeSnapshot } from './snapshot.ts';
import { activateCard, createGame } from './transition.ts';

describe('snapshots', () => {
  it('round trips a pending mismatch with active time remaining', () => {
    let game = createGame('np1-4-1');
    if (!game) throw new Error('The test board was rejected.');
    game = activateCard(activateCard(game, 0), 1);
    const restored = decodeSnapshot(encodeSnapshot(game));
    expect(restored).toEqual(game);
  });

  it.each([
    '{"version":1,"boardCode":"np1-4-1","matched":[0],"selection":{"kind":"closed"},"moves":1,"elapsedMs":0,"started":true}',
    '{"version":1,"boardCode":"np1-4-1","matched":[],"selection":{"kind":"closed","extra":0},"moves":0,"elapsedMs":0,"started":false}',
    '{"version":1,"boardCode":"np1-4-1","matched":[],"selection":{"kind":"one","index":0},"moves":0,"elapsedMs":2,"started":false}',
    '{"version":1,"boardCode":"np1-4-1","matched":[],"selection":{"kind":"mismatch","first":2,"second":6,"remainingMs":800},"moves":1,"elapsedMs":0,"started":true}',
  ])('rejects inconsistent snapshot %s', (input) => expect(decodeSnapshot(input)).toBeNull());
});
