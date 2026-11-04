import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { decodeSnapshot } from '../src/game/snapshot.ts';

describe('replay command', () => {
  it('prints only valid snapshot JSON, preserving paths with spaces', () => {
    const directory = mkdtempSync(join(tmpdir(), 'neon-pairs-'));
    try {
      const path = join(directory, 'example replay.json');
      writeFileSync(path, JSON.stringify({ version: 1, boardCode: 'np1-4-1',
        actions: [{ atMs: 0, index: 0 }, { atMs: 0, index: 11 }], endMs: 800 }));
      const result = spawnSync('npm', ['run', '--silent', 'replay', '--', path], { encoding: 'utf8' });
      expect(result.status).toBe(0);
      expect(result.stderr).toBe('');
      expect(decodeSnapshot(result.stdout)?.elapsedMs).toBe(800);
      expect(decodeSnapshot(result.stdout)?.matched).toEqual([0, 11]);
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });

  it('keeps stdout empty and exits nonzero for invalid or missing input', () => {
    const directory = mkdtempSync(join(tmpdir(), 'neon-pairs-'));
    try {
      const path = join(directory, 'invalid.json');
      writeFileSync(path, '{}');
      for (const args of [[path], [], [join(directory, 'missing.json')]]) {
        const result = spawnSync('npm', ['run', '--silent', 'replay', '--', ...args], { encoding: 'utf8' });
        expect(result.status).not.toBe(0);
        expect(result.stdout).toBe('');
        expect(result.stderr.length).toBeGreaterThan(0);
      }
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });
});
