import { readFileSync } from 'node:fs';
import { replayGame } from '../src/game/replay.ts';
import { encodeSnapshot } from '../src/game/snapshot.ts';
try {
  const path = process.argv[2];
  if (!path || process.argv.length !== 3) throw new Error('Provide one replay path.');
  const state = replayGame(readFileSync(path, 'utf8'));
  if (!state) throw new Error('Invalid replay.');
  process.stdout.write(`${encodeSnapshot(state)}\n`);
} catch (error) { process.stderr.write(`${error instanceof Error ? error.message : 'Invalid replay.'}\n`); process.exitCode = 1; }
