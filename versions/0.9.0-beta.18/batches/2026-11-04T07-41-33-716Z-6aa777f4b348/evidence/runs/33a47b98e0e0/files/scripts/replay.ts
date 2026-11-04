import { readFile } from 'node:fs/promises';
import { encodeSnapshot } from '../src/game/snapshot.ts';
import { replayGame } from '../src/game/replay.ts';

async function main(): Promise<void> {
  const path = process.argv[2];
  if (process.argv.length !== 3 || path === undefined) {
    console.error('Usage: npm run --silent replay -- PATH');
    process.exitCode = 1;
    return;
  }
  try {
    const text = await readFile(path, 'utf8');
    const state = replayGame(text);
    if (state === null) {
      console.error('Invalid replay file.');
      process.exitCode = 1;
      return;
    }
    console.log(encodeSnapshot(state));
  } catch {
    console.error('Unable to read replay file.');
    process.exitCode = 1;
  }
}

await main();
