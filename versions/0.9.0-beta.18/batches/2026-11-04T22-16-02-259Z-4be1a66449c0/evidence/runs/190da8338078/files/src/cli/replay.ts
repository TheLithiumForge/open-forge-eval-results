import { readFile } from 'node:fs/promises';
import { replayGame } from '../game/replay.ts';
import { encodeSnapshot } from '../game/snapshot.ts';

async function main(): Promise<void> {
  const path = process.argv[2];
  if (!path || process.argv.length !== 3) throw new Error('Provide one replay file path.');
  const text = await readFile(path, 'utf8');
  const state = replayGame(text);
  if (!state) throw new Error('Invalid replay.');
  process.stdout.write(`${encodeSnapshot(state)}\n`);
}

main().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.message : 'Unable to read replay.'}\n`);
  process.exitCode = 1;
});
