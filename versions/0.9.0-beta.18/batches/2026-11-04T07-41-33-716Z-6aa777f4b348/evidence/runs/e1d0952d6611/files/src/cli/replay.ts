import { readFile } from 'node:fs/promises';
import { encodeSnapshot } from '../game/snapshot.ts';
import { replayGame } from '../game/replay.ts';

async function main(): Promise<void> {
  const path = process.argv[2];
  if (process.argv.length !== 3 || path === undefined) {
    process.stderr.write('Usage: npm run --silent replay -- PATH\n');
    process.exitCode = 1;
    return;
  }
  try {
    const text = await readFile(path, 'utf8');
    const state = replayGame(text);
    if (state === null) {
      process.stderr.write('Invalid replay.\n');
      process.exitCode = 1;
      return;
    }
    process.stdout.write(`${encodeSnapshot(state)}\n`);
  } catch {
    process.stderr.write('Invalid replay file.\n');
    process.exitCode = 1;
  }
}

await main();
