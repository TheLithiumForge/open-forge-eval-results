import { expect, test } from '@playwright/test';
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';

test('documented replay command emits only the final snapshot JSON', () => {
  const result = spawnSync('npm', ['run', '--silent', 'replay', '--', resolve('tests/fixtures/replay-valid.json')], { encoding: 'utf8' });
  expect(result.status).toBe(0);
  expect(result.stderr).toBe('');
  expect(JSON.parse(result.stdout)).toEqual({ version: 1, boardCode: 'np1-4-1', matched: [0, 11],
    selection: { kind: 'closed' }, moves: 1, elapsedMs: 800, started: true });
});

for (const file of ['replay-invalid.json', 'missing.json']) {
  test(`documented replay command rejects ${file} without stdout`, () => {
    const result = spawnSync('npm', ['run', '--silent', 'replay', '--', resolve('tests/fixtures', file)], { encoding: 'utf8' });
    expect(result.status).not.toBe(0);
    expect(result.stdout).toBe('');
    expect(result.stderr.trim().length).toBeGreaterThan(0);
  });
}
