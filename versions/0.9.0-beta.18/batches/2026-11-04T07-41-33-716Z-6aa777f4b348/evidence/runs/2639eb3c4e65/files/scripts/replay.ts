import { readFile } from 'node:fs/promises';
import { replayGame, REPLAY_BYTES } from '../src/game/replay.ts';
import { encodeSnapshot } from '../src/game/snapshot.ts';

try {
  const path = process.argv[2];
  if (!path || process.argv.length !== 3) throw new Error('Usage: npm run --silent replay -- PATH');
  const file = await readFile(path);
  if (file.byteLength > REPLAY_BYTES) throw new Error('Replay exceeds the byte limit.');
  const result = replayGame(file.toString('utf8'));
  if (!result) throw new Error('Invalid replay.');
  process.stdout.write(`${encodeSnapshot(result)}\n`);
} catch (error) {
  process.stderr.write(`${error instanceof Error ? error.message : 'Cannot read replay.'}\n`);
  process.exitCode = 1;
}
