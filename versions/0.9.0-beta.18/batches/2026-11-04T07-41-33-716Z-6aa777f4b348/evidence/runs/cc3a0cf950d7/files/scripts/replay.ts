import { readFileSync } from 'node:fs';
import { replayGame } from '../src/game/replay.ts';
import { encodeSnapshot } from '../src/game/snapshot.ts';

try {
  const path = process.argv[2];
  if (!path || process.argv.length !== 3) throw new Error('Usage: npm run --silent replay -- PATH');
  const result = replayGame(readFileSync(path, 'utf8'));
  if (!result) throw new Error('Invalid replay.');
  process.stdout.write(`${encodeSnapshot(result)}\n`);
} catch (error: unknown) {
  process.stderr.write(`${error instanceof Error ? error.message : 'Unable to read replay.'}\n`);
  process.exitCode = 1;
}
