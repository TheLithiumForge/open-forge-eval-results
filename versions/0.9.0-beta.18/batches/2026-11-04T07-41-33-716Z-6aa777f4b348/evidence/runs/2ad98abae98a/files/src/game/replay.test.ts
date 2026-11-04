import { spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { replayGame } from './replay.ts';
import { decodeSnapshot } from './snapshot.ts';
import { MAX_ELAPSED_MS } from './transitions.ts';

const sample = { version: 1, boardCode: 'np1-4-1', actions: [{ atMs: 0, index: 0 }, { atMs: 0, index: 11 }], endMs: 800 };
describe('logical replay', () => {
  it('runs the published replay in equal-time array order', () => {
    const state = replayGame(JSON.stringify(sample));
    expect(state?.matched).toEqual([0, 11]);
    expect(state?.moves).toBe(1);
    expect(state?.elapsedMs).toBe(800);
  });
  it('resolves exactly expired mismatches before actions and ignores earlier activations', () => {
    const actions = [{ atMs: 100, index: 0 }, { atMs: 200, index: 1 },
      { atMs: 999, index: 2 }, { atMs: 1000, index: 2 }, { atMs: 1000, index: 6 }];
    const state = replayGame(JSON.stringify({ ...sample, actions, endMs: 1100 }));
    expect(state?.matched).toEqual([2, 6]);
    expect(state?.moves).toBe(2);
    expect(state?.elapsedMs).toBe(1000);
  });
  it('starts elapsed time at the first valid action and caps huge timelines', () => {
    expect(replayGame(JSON.stringify({ ...sample, actions: [], endMs: 1000 }))?.elapsedMs).toBe(0);
    expect(replayGame(JSON.stringify({ ...sample, endMs: Number.MAX_SAFE_INTEGER }))?.elapsedMs).toBe(MAX_ELAPSED_MS);
  });
  it.each([
    { version: 2 }, { extra: true }, { boardCode: 'np1-4-0' }, { endMs: -1 }, { endMs: 0.5 },
    { endMs: 1e16 }, { actions: [{ atMs: 10, index: 0 }], endMs: 9 },
    { actions: [{ atMs: 2, index: 0 }, { atMs: 1, index: 1 }] },
    { actions: [{ atMs: 0, index: 16 }] }, { actions: [{ atMs: 0, index: 0, extra: 1 }] },
    { actions: Array.from({ length: 10001 }, () => ({ atMs: 0, index: 0 })) },
  ])('rejects invalid replay fields', patch => expect(replayGame(JSON.stringify({ ...sample, ...patch }))).toBeNull());
  it('enforces replay bytes and malformed JSON', () => {
    const text = JSON.stringify(sample);
    expect(replayGame(text + ' '.repeat(1048576 - text.length))).not.toBeNull();
    expect(replayGame(text + ' '.repeat(1048577 - text.length))).toBeNull();
    expect(replayGame('{')).toBeNull();
  });
  it('CLI emits only a snapshot on success, only stderr on failure', () => {
    const directory = mkdtempSync(join(tmpdir(), 'neon-replay-'));
    const path = join(directory, 'replay.json');
    try {
      writeFileSync(path, JSON.stringify(sample));
      const valid = spawnSync(process.execPath, ['scripts/replay.ts', path], { encoding: 'utf8' });
      expect(valid.status).toBe(0);
      expect(valid.stderr).toBe('');
      expect(decodeSnapshot(valid.stdout)?.matched).toEqual([0, 11]);
      writeFileSync(path, '{}');
      const invalid = spawnSync(process.execPath, ['scripts/replay.ts', path], { encoding: 'utf8' });
      expect(invalid.status).not.toBe(0);
      expect(invalid.stdout).toBe('');
      expect(invalid.stderr).toContain('Invalid replay.');
    } finally { rmSync(directory, { recursive: true, force: true }); }
  });
});
