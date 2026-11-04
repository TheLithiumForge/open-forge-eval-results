import { expect, it } from 'vitest';
import { decodeSnapshot, encodeSnapshot, replayGame } from './formats.ts';
it('round trips the documented snapshot and rejects inconsistent or extra data', () => {
  const text = '{"version":1,"boardCode":"np1-4-1","matched":[0,11],"selection":{"kind":"mismatch","first":1,"second":2,"remainingMs":300},"moves":2,"elapsedMs":1500,"started":true}';
  const game = decodeSnapshot(text); expect(game).not.toBeNull(); if (!game) throw new Error();
  expect(decodeSnapshot(encodeSnapshot(game))).toEqual(game);
  expect(decodeSnapshot(text.replace('"moves":2','"moves":1'))).toBeNull();
  expect(decodeSnapshot(text.replace('"version":1','"extra":0,"version":1'))).toBeNull();
});
it('resolves a mismatch before an action at its exact deadline', () => {
  const game = replayGame(JSON.stringify({version:1,boardCode:'np1-4-1',actions:[{atMs:0,index:0},{atMs:0,index:1},{atMs:800,index:2}],endMs:800}));
  expect(game?.selection).toEqual({kind:'one',index:2}); expect(game?.elapsedMs).toBe(800);
  expect(replayGame('{"version":1}')).toBeNull();
});
