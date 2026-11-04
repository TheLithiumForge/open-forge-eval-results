import { readFile } from 'node:fs/promises';
import { replayGame } from '../src/game/replay.ts';
import { encodeSnapshot } from '../src/game/snapshot.ts';

try {
  const path = process.argv[2];
  if (!path || process.argv.length !== 3) throw new Error('Usage: npm run --silent replay -- PATH');
  const state = replayGame(await readFile(path, 'utf8'));
  if (!state) throw new Error('Invalid replay.');
  process.stdout.write(`${encodeSnapshot(state)}\n`);
} catch (error) {
  process.stderr.write(`${error instanceof Error ? error.message : 'Unable to replay file.'}\n`);
  process.exitCode = 1;
}
