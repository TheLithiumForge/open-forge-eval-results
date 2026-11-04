import { describe, expect, it } from 'vitest';
import { replayGame, REPLAY_ACTION_LIMIT, REPLAY_BYTE_LIMIT } from './replay.ts';
import { isWon } from './state.ts';
import { testGame } from './state.test-support.ts';
import { MAX_ELAPSED_MS } from './transitions.ts';

const base = { version: 1, boardCode: 'np1-4-1', actions: [], endMs: 0 };
const run = (actions: readonly { atMs: number; index: number }[], endMs: number) =>
  replayGame(JSON.stringify({ ...base, actions, endMs }));

describe('logical replay', () => {
  it('replays the documented example', () => {
    expect(run([{ atMs: 0, index: 0 }, { atMs: 0, index: 11 }], 800)).toMatchObject({
      matched: [0, 11], selection: { kind: 'closed' }, moves: 1, elapsedMs: 800, started: true,
    });
  });

  it('resolves exact-time mismatch expiry before the next action', () => {
    expect(run([
      { atMs: 100, index: 0 }, { atMs: 100, index: 1 },
      { atMs: 899, index: 2 }, { atMs: 900, index: 2 }, { atMs: 900, index: 6 },
    ], 1000)).toMatchObject({
      matched: [2, 6], selection: { kind: 'closed' }, moves: 2, elapsedMs: 900,
    });
  });

  it('preserves equal-time array order and ignores repeated/matched activations', () => {
    expect(run([
      { atMs: 2000, index: 0 }, { atMs: 2000, index: 0 },
      { atMs: 2000, index: 11 }, { atMs: 2000, index: 11 }, { atMs: 2000, index: 2 },
    ], 2100)).toMatchObject({
      matched: [0, 11], selection: { kind: 'one', index: 2 }, moves: 1, elapsedMs: 100,
    });
  });

  it('accepts safe-integer timeline limits and caps only active elapsed time', () => {
    expect(run([{ atMs: 0, index: 0 }], Number.MAX_SAFE_INTEGER)?.elapsedMs).toBe(MAX_ELAPSED_MS);
    expect(run([{ atMs: Number.MAX_SAFE_INTEGER, index: 0 }], Number.MAX_SAFE_INTEGER)?.elapsedMs)
      .toBe(0);
    expect(run([], Number.MAX_SAFE_INTEGER)?.started).toBe(false);
  });

  it('stops elapsed time at completion even when replay continues', () => {
    const deck = testGame().board.deck;
    const actions = Array.from({ length: 8 }, (_, face) => [
      { atMs: face * 100, index: deck.indexOf(face) },
      { atMs: face * 100, index: deck.lastIndexOf(face) },
    ]).flat();
    actions.push({ atMs: 5000, index: 0 });
    const state = run(actions, Number.MAX_SAFE_INTEGER);
    if (!state) throw new Error('Valid winning replay must load.');
    expect(isWon(state)).toBe(true);
    expect(state.moves).toBe(8);
    expect(state.elapsedMs).toBe(700);
  });

  it('accepts exactly the action and UTF-8 limits', () => {
    const actions = Array.from({ length: REPLAY_ACTION_LIMIT }, () => ({ atMs: 0, index: 0 }));
    expect(run(actions, 0)).not.toBeNull();
    expect(run([...actions, { atMs: 0, index: 0 }], 0)).toBeNull();
    const json = JSON.stringify(base);
    expect(replayGame(json + ' '.repeat(REPLAY_BYTE_LIMIT - json.length))).not.toBeNull();
    expect(replayGame(json + ' '.repeat(REPLAY_BYTE_LIMIT))).toBeNull();
  });
});

describe('untrusted replay validation', () => {
  it.each([
    null, [], {}, { ...base, version: 2 }, { ...base, unknown: 1 }, { ...base, boardCode: 'np1-4-0' },
    { ...base, boardCode: 1 }, { ...base, endMs: -1 }, { ...base, endMs: 1.5 },
    { ...base, endMs: Number.MAX_SAFE_INTEGER + 1 }, { ...base, actions: {} },
    { ...base, actions: [{ atMs: 1, index: 0 }] },
    { ...base, endMs: 2, actions: [{ atMs: 2, index: 0 }, { atMs: 1, index: 1 }] },
  ])('rejects invalid replay %j', (value) => {
    expect(replayGame(JSON.stringify(value))).toBeNull();
  });

  it.each([
    null, {}, { atMs: 0 }, { index: 0 }, { atMs: -1, index: 0 }, { atMs: 0.5, index: 0 },
    { atMs: 0, index: -1 }, { atMs: 0, index: 16 }, { atMs: 0, index: 0.5 },
    { atMs: 0, index: '0' }, { atMs: 0, index: 0, extra: true },
    { atMs: Number.MAX_SAFE_INTEGER + 1, index: 0 },
  ])('rejects invalid action %j', (action) => {
    expect(replayGame(JSON.stringify({ ...base, actions: [action] }))).toBeNull();
  });

  it('rejects malformed and missing fields', () => {
    expect(replayGame('{')).toBeNull();
    expect(replayGame('{"version":1,"boardCode":"np1-4-1","actions":[]}')).toBeNull();
  });
});
