import { describe, expect, it } from 'vitest';
import { createGame, KIND } from './state.ts';
import { activateCard } from './transitions.ts';
import { decodeSnapshot, encodeSnapshot, SNAPSHOT_BYTES } from './snapshot.ts';

const example = { version: 1, boardCode: 'np1-4-1', matched: [0, 11],
  selection: { kind: 'mismatch', first: 1, second: 2, remainingMs: 300 },
  moves: 2, elapsedMs: 1500, started: true };
const decode = (changes: Record<string, unknown>) => decodeSnapshot(JSON.stringify({ ...example, ...changes }));

describe('snapshot contract (D05–D07, D10)', () => {
  it('loads the documented mismatch', () => {
    const game = decode({});
    expect(game?.matched).toEqual([0, 11]);
    expect(game?.selection).toEqual(example.selection);
    expect(game?.elapsedMs).toBe(1500);
  });
  it('round trips closed, one-card and mismatch states', () => {
    let game = createGame('np1-4-1');
    expect(decodeSnapshot(encodeSnapshot(game))).toEqual(game);
    game = activateCard(game, 0);
    expect(decodeSnapshot(encodeSnapshot(game))).toEqual(game);
    game = activateCard(game, 1);
    expect(decodeSnapshot(encodeSnapshot(game))).toEqual(game);
  });
  it.each([
    { extra: true }, { version: 2 }, { boardCode: ' np1-4-1' }, { matched: [0] },
    { matched: [0, 0] }, { matched: [0, 1] }, { matched: [0, 11, 0, 11] },
    { matched: [0, 16] }, { matched: [-1, 11] }, { matched: ['0', 11] },
    { moves: 1 }, { moves: -1 }, { moves: 1.5 }, { moves: 1000000 }, { moves: '2' },
    { elapsedMs: -1 }, { elapsedMs: 0.1 }, { elapsedMs: 360000000 },
    { elapsedMs: Number.MAX_SAFE_INTEGER + 1 }, { started: 1 }, { started: false },
    { selection: { kind: 'closed', index: 1 } }, { selection: { kind: 'one', index: 0 } },
    { selection: { kind: 'one', index: 16 } }, { selection: { kind: 'one', index: 1, extra: 1 } },
    { selection: { kind: 'mismatch', first: 1, second: 9, remainingMs: 300 } },
    { selection: { kind: 'mismatch', first: 1, second: 1, remainingMs: 300 } },
    { selection: { kind: 'mismatch', first: 0, second: 1, remainingMs: 300 } },
    ...[0, -1, 801, 0.5, '300'].map(remainingMs => ({ selection: { ...example.selection, remainingMs } })),
    { selection: null }, { matched: null },
  ])('rejects inconsistent or unknown data %j', changes => { expect(decode(changes)).toBeNull(); });
  it('requires the special zero-move started state to have one card', () => {
    const base = { matched: [], moves: 0, elapsedMs: 0 };
    expect(decode({ ...base, selection: { kind: KIND.closed } })).toBeNull();
    expect(decode({ ...base, selection: { kind: KIND.one, index: 0 } })).not.toBeNull();
    expect(decode({ ...base, started: false, selection: { kind: KIND.closed } })).not.toBeNull();
    expect(decode({ ...base, started: false, elapsedMs: 1, selection: { kind: KIND.closed } })).toBeNull();
  });
  it('accepts a completed state but requires enough moves', () => {
    const matched = Array.from({ length: 16 }, (_, index) => index);
    expect(decode({ matched, selection: { kind: KIND.closed }, moves: 8 })).not.toBeNull();
    expect(decode({ matched, selection: { kind: KIND.closed }, moves: 7 })).toBeNull();
  });
  it('does not require a verified play history', () => {
    expect(decode({ selection: { kind: KIND.closed }, elapsedMs: 0, moves: 999999 })).not.toBeNull();
  });
  it('enforces UTF-8 bytes, including otherwise valid trailing whitespace', () => {
    const text = encodeSnapshot(createGame('np1-4-1'));
    expect(decodeSnapshot(text.padEnd(SNAPSHOT_BYTES, ' '))).not.toBeNull();
    expect(decodeSnapshot(text.padEnd(SNAPSHOT_BYTES + 1, ' '))).toBeNull();
    const multibyte = JSON.stringify({ ...example, boardCode: 'é'.repeat(33000) });
    expect(multibyte.length).toBeLessThan(SNAPSHOT_BYTES);
    expect(decodeSnapshot(multibyte)).toBeNull();
  });
  it.each(['{', 'null', '[]', 'true', '{}'])('rejects invalid JSON data %j', text => {
    expect(decodeSnapshot(text)).toBeNull();
  });
});
