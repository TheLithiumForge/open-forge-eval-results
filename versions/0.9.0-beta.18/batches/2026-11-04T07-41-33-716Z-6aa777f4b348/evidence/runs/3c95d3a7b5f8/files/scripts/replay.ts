import { readFile } from 'node:fs/promises';
import { replayGame } from '../src/game/replay.ts';
import { encodeSnapshot } from '../src/game/snapshot.ts';

async function main(): Promise<void> {
  const [path, ...extra] = process.argv.slice(2);
  if (!path || extra.length !== 0) throw new Error('Usage: npm run --silent replay -- PATH');
  const state = replayGame(await readFile(path, 'utf8'));
  if (!state) throw new Error('Invalid replay.');
  process.stdout.write(`${encodeSnapshot(state)}\n`);
}

try {
  await main();
} catch (error: unknown) {
  process.stderr.write(`${error instanceof Error ? error.message : 'Unable to read replay.'}\n`);
  process.exitCode = 1;
}
