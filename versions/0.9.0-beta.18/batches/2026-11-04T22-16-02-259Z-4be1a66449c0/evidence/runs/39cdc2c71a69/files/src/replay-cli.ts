import { readFileSync } from 'node:fs';
import { replayGame } from './game/replay.ts';
import { encodeSnapshot } from './game/snapshot.ts';
try {
  const path = process.argv[2];
  if (!path || process.argv.length !== 3) throw new Error('Provide a replay path');
  const game = replayGame(readFileSync(path, 'utf8'));
  if (!game) throw new Error('Invalid replay');
  process.stdout.write(encodeSnapshot(game) + '\n');
} catch (error) { process.stderr.write(`${error instanceof Error ? error.message : 'Invalid replay'}\n`); process.exitCode = 1; }
