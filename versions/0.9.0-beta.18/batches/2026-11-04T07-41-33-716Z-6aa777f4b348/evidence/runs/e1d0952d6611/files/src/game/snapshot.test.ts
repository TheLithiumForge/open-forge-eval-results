import { describe, expect, it } from 'vitest';
import { createGame } from './state.ts';
import { activateCard } from './transitions.ts';
import { decodeSnapshot, encodeSnapshot } from './snapshot.ts';

const start = () => {
  const state = createGame('np1-4-1');
  if (state === null) throw new Error('Test board must be valid');
  return state;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function parseObject(text: string): Record<string, unknown> {
  const parsed: unknown = JSON.parse(text);
  if (!isRecord(parsed)) throw new Error('Expected object');
  return parsed;
}

describe('version 1 snapshots', () => {
  it('round trips closed, one-card and mismatch progress', () => {
    const states = [start(), activateCard(start(), 0),
      activateCard(activateCard(start(), 1), 2)];
    for (const state of states) expect(decodeSnapshot(encodeSnapshot(state))).toEqual(state);
  });

  it('accepts the documented example', () => {
    const sample = '{"version":1,"boardCode":"np1-4-1","matched":[0,11],"selection":{"kind":"mismatch","first":1,"second":2,"remainingMs":300},"moves":2,"elapsedMs":1500,"started":true}';
    expect(decodeSnapshot(sample)?.matched).toEqual([0, 11]);
  });

  it('rejects malformed JSON, oversized UTF-8 and unknown or missing fields', () => {
    expect(decodeSnapshot('{')).toBeNull();
    expect(decodeSnapshot('é'.repeat(32_769))).toBeNull();
    const valid = parseObject(encodeSnapshot(start()));
    expect(decodeSnapshot(JSON.stringify({ ...valid, surprise: true }))).toBeNull();
    const missing = { ...valid };
    delete missing.version;
    expect(decodeSnapshot(JSON.stringify(missing))).toBeNull();
  });

  it('rejects partial pairs, duplicate positions, invalid selections and inconsistent moves', () => {
    const base = parseObject(encodeSnapshot(activateCard(start(), 0)));
    for (const change of [
      { matched: [0] }, { matched: [0, 0] },
      { selection: { kind: 'one', index: 99 } },
      { selection: { kind: 'mismatch', first: 0, second: 11, remainingMs: 800 } },
      { started: false }, { selection: { kind: 'closed' } },
    ]) expect(decodeSnapshot(JSON.stringify({ ...base, ...change }))).toBeNull();
  });

  it('requires a visible card when a started game has zero moves', () => {
    const hiddenStarted = { version: 1, boardCode: 'np1-4-1', matched: [],
      selection: { kind: 'closed' }, moves: 0, elapsedMs: 0, started: true };
    expect(decodeSnapshot(JSON.stringify(hiddenStarted))).toBeNull();
  });

  it('rejects snapshots outside safe integer and saved-counter limits', () => {
    const base = parseObject(encodeSnapshot(start()));
    const rejected = [
      { ...base, moves: -1 },
      { ...base, moves: 1_000_000 },
      { ...base, moves: Number.MAX_SAFE_INTEGER + 1 },
      { ...base, elapsedMs: 360_000_000 },
      { ...base, started: true },
      { ...base, matched: [0], moves: 1, started: true },
      { ...base, selection: { kind: 'mismatch', first: 0, second: 1, remainingMs: 0 }, moves: 1, started: true },
      { ...base, selection: { kind: 'mismatch', first: 0, second: 1, remainingMs: 801 }, moves: 1, started: true },
      { ...base, selection: { kind: 'closed', extra: true }, started: true },
    ];
    for (const item of rejected) expect(decodeSnapshot(JSON.stringify(item))).toBeNull();
    expect(decodeSnapshot(JSON.stringify({ ...base, selection: { kind: 'one', index: 0 }, started: true })))
      .not.toBeNull();
  });

  it('preserves only real seconds when encoding fractional active time', () => {
    const state = activateCard(activateCard(start(), 1), 2);
    const mismatch = decodeSnapshot(encodeSnapshot({ ...state, elapsedMs: 1_234.9 }));
    expect(mismatch?.elapsedMs).toBe(1234);
    if (mismatch?.selection.kind === 'mismatch') expect(mismatch.selection.remainingMs).toBe(800);
  });
});
