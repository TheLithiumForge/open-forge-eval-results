import { describe, expect, it } from 'vitest';
import { createGame } from './state.ts';
import { activateCard, advanceGame } from './transitions.ts';
import { decodeSnapshot, encodeSnapshot, SNAPSHOT_BYTE_LIMIT } from './snapshot.ts';
import { parseLimitedJson } from './formatValidation.ts';

const BASE = { version: 1, boardCode: 'np1-4-1', matched: [0, 11],
  selection: { kind: 'mismatch', first: 1, second: 2, remainingMs: 300 },
  moves: 2, elapsedMs: 1500, started: true };
const snapshot = (changes: Record<string, unknown> = {}): string => JSON.stringify({ ...BASE, ...changes });

describe('version 1 snapshots', () => {
  it('round-trips the documented example without adding derived fields', () => {
    const state = decodeSnapshot(snapshot());
    expect(state).not.toBeNull();
    if (!state) throw new Error('Example must parse');
    expect(JSON.parse(encodeSnapshot(state))).toEqual(BASE);
    expect(state.deck).toEqual([6, 7, 0, 5, 2, 2, 0, 5, 3, 7, 1, 6, 4, 4, 1, 3]);
  });

  it('round-trips a new game, single reveal, match and completed game', () => {
    const game = createGame('np1-4-1');
    if (!game) throw new Error('Invalid test board');
    const reveal = activateCard(game, 0);
    const matched = activateCard(reveal, 11);
    for (const state of [game, reveal, matched]) expect(decodeSnapshot(encodeSnapshot(state))).toEqual(state);
    const completed = decodeSnapshot(snapshot({ matched: Array.from({ length: 16 }, (_, i) => i),
      selection: { kind: 'closed' }, moves: 8 }));
    expect(completed?.matched).toHaveLength(16);
  });

  it('exports whole milliseconds without dropping a pending mismatch', () => {
    const state = decodeSnapshot(snapshot());
    if (!state) throw new Error('Invalid test snapshot');
    const precise = advanceGame(state, 299.75);
    expect(JSON.parse(encodeSnapshot(precise))).toMatchObject({ elapsedMs: 1799,
      selection: { remainingMs: 1 } });
    expect(decodeSnapshot(encodeSnapshot(precise))).not.toBeNull();
  });

  it.each([
    { version: 2 }, { unexpected: true }, { deck: [] }, { boardCode: ' np1-4-1' },
    { boardCode: 'np1-4-1\n' }, { matched: [0] }, { matched: [0, 1] },
    { matched: [0, 11, 11] }, { matched: [0, 16] }, { matched: [-1, 11] },
    { matched: ['0', 11] }, { matched: null }, { started: 1 }, { started: false },
    { moves: 1 }, { moves: -1 }, { moves: 2.5 }, { moves: 1_000_000 },
    { moves: Number.MAX_SAFE_INTEGER + 1 }, { elapsedMs: -1 }, { elapsedMs: 1.5 },
    { elapsedMs: 360_000_000 }, { elapsedMs: null },
    { selection: { kind: 'closed', index: 2 } },
    { selection: { kind: 'one', index: 0 } },
    { selection: { kind: 'one', index: 16 } },
    { selection: { kind: 'one', index: 1, remainingMs: 10 } },
    { selection: { kind: 'mismatch', first: 1, second: 1, remainingMs: 300 } },
    { selection: { kind: 'mismatch', first: 1, second: 9, remainingMs: 300 } },
    { selection: { kind: 'mismatch', first: 0, second: 2, remainingMs: 300 } },
    { selection: { kind: 'mismatch', first: 1, second: 2, remainingMs: 0 } },
    { selection: { kind: 'mismatch', first: 1, second: 2, remainingMs: 801 } },
    { selection: { kind: 'mismatch', first: 1, second: 2, remainingMs: 1.5 } },
    { selection: { kind: 'mismatch', first: 1, second: 2, remainingMs: 1, extra: true } },
    { selection: { kind: 'unknown' } }, { selection: null },
  ])('rejects inconsistent or extended state %j', (changes) => {
    expect(decodeSnapshot(snapshot(changes))).toBeNull();
  });

  it('requires pristine unstarted state and one reveal for started zero-move state', () => {
    const pristine = { matched: [], selection: { kind: 'closed' }, moves: 0,
      elapsedMs: 0, started: false };
    expect(decodeSnapshot(snapshot(pristine))).not.toBeNull();
    expect(decodeSnapshot(snapshot({ ...pristine, elapsedMs: 1 }))).toBeNull();
    expect(decodeSnapshot(snapshot({ ...pristine, selection: { kind: 'one', index: 1 } }))).toBeNull();
    expect(decodeSnapshot(snapshot({ ...pristine, started: true }))).toBeNull();
    expect(decodeSnapshot(snapshot({ ...pristine, started: true, selection: { kind: 'one', index: 1 } })))
      .not.toBeNull();
  });

  it('validates declared constraints without reconstructing earlier history', () => {
    expect(decodeSnapshot(snapshot({ matched: [], selection: { kind: 'closed' },
      moves: 999999, elapsedMs: 359999999 }))).not.toBeNull();
    expect(decodeSnapshot(snapshot({ matched: [], selection: { kind: 'one', index: 1 },
      moves: 0, elapsedMs: 359999999 }))).not.toBeNull();
  });

  it('rejects malformed JSON and enforces UTF-8 byte limits', () => {
    for (const text of ['null', '[]', '{}', '{', '', 'true']) expect(decodeSnapshot(text)).toBeNull();
    const valid = snapshot();
    expect(decodeSnapshot(valid.padEnd(SNAPSHOT_BYTE_LIMIT, ' '))).not.toBeNull();
    expect(decodeSnapshot(valid.padEnd(SNAPSHOT_BYTE_LIMIT + 1, ' '))).toBeNull();
    expect(parseLimitedJson('"é"', 3)).toBeNull();
    expect(parseLimitedJson('"é"', 4)).toBe('é');
  });
});
