import { readFile } from 'node:fs/promises';
import { replayGame, REPLAY_BYTES } from '../src/game/replay.ts';
import { encodeSnapshot } from '../src/game/snapshot.ts';

try {
  const path = process.argv[2];
  if (!path || process.argv.length !== 3) throw new Error('Usage: npm run --silent replay -- PATH');
  const data = await readFile(path);
  if (data.byteLength > REPLAY_BYTES) throw new Error('Replay exceeds 1048576 bytes.');
  const game = replayGame(new TextDecoder('utf-8', { fatal: true }).decode(data));
  if (!game) throw new Error('Invalid replay.');
  process.stdout.write(`${encodeSnapshot(game)}\n`);
} catch (error: unknown) {
  process.stderr.write(`${error instanceof Error ? error.message : 'Unable to read replay.'}\n`);
  process.exitCode = 1;
}
