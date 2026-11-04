import { readFile, stat } from 'node:fs/promises';
import { replayGame, REPLAY_BYTE_LIMIT } from '../src/game/replay.ts';
import { encodeSnapshot } from '../src/game/snapshot.ts';

try {
  const path = process.argv[2];
  if (!path || process.argv.length !== 3) throw new Error('Usage: npm run --silent replay -- PATH');
  if ((await stat(path)).size > REPLAY_BYTE_LIMIT) throw new Error('Replay exceeds the byte limit.');
  const state = replayGame(await readFile(path, 'utf8'));
  if (!state) throw new Error('Invalid replay.');
  process.stdout.write(`${encodeSnapshot(state)}\n`);
} catch (error) {
  process.stderr.write(`${error instanceof Error ? error.message : 'Unable to read replay.'}\n`);
  process.exitCode = 1;
}
