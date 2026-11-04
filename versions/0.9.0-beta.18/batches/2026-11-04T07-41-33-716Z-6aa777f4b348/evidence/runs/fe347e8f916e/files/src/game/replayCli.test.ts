import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { afterAll, expect, it } from 'vitest';
import { decodeSnapshot } from './snapshot.ts';

const folder = mkdtempSync(join(tmpdir(), 'neon-replay-'));
afterAll(() => rmSync(folder, { recursive: true, force: true }));
const run = (path: string) => spawnSync(process.execPath, ['scripts/replay.ts', path], { encoding: 'utf8' });

it('prints only the resulting snapshot on success', () => {
  const path = join(folder, 'valid.json');
  writeFileSync(path, JSON.stringify({ version: 1, boardCode: 'np1-4-1', actions: [
    { atMs: 0, index: 0 }, { atMs: 0, index: 11 }], endMs: 800 }));
  const result = run(path);
  expect(result.status).toBe(0);
  expect(result.stderr).toBe('');
  expect(decodeSnapshot(result.stdout)).toMatchObject({ moves: 1, elapsedMs: 800, matched: [0, 11] });
});
it('prints nothing to stdout and fails for invalid, unreadable and malformed UTF-8 files', () => {
  const invalid = join(folder, 'invalid.json');
  const utf8 = join(folder, 'encoding.json');
  writeFileSync(invalid, '{}');
  writeFileSync(utf8, Buffer.from([0xff]));
  for (const path of [invalid, utf8, join(folder, 'missing.json')]) {
    const result = run(path);
    expect(result.status).not.toBe(0);
    expect(result.stdout).toBe('');
    expect(result.stderr.length).toBeGreaterThan(0);
  }
});
