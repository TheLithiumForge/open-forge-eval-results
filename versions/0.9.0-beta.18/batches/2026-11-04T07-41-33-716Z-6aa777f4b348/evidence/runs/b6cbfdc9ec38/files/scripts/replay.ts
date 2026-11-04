import { readFile } from 'node:fs/promises';
import { replayGame, REPLAY_BYTE_LIMIT } from '../src/game/replay.ts';
import { encodeSnapshot } from '../src/game/snapshot.ts';

try {
  const path = process.argv[2];
  if (!path || process.argv.length !== 3) throw new Error('Usage: npm run --silent replay -- PATH');
  const bytes = await readFile(path);
  if (bytes.byteLength > REPLAY_BYTE_LIMIT) throw new Error('Replay exceeds the byte limit.');
  const text = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  const state = replayGame(text);
  if (!state) throw new Error('Invalid replay.');
  process.stdout.write(`${encodeSnapshot(state)}\n`);
} catch (error: unknown) {
  process.stderr.write(`${error instanceof Error ? error.message : 'Could not read replay.'}\n`);
  process.exitCode = 1;
}
