import { readFile } from 'node:fs/promises';
import { replayGame, REPLAY_BYTE_LIMIT } from './replay.ts';
import { encodeSnapshot } from './snapshot.ts';

try {
  const path = process.argv[2];
  if (!path || process.argv.length !== 3) throw new Error('Usage: npm run --silent replay -- PATH');
  const bytes = await readFile(path);
  if (bytes.length > REPLAY_BYTE_LIMIT) throw new Error('Replay exceeds the byte limit.');
  const state = replayGame(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
  if (!state) throw new Error('Invalid replay.');
  process.stdout.write(`${encodeSnapshot(state)}\n`);
} catch (error) {
  process.stderr.write(`${error instanceof Error ? error.message : 'Unable to read replay.'}\n`);
  process.exitCode = 1;
}
