import { readFile } from 'node:fs/promises';
import { replayGame } from '../src/game/reproducibility/replay.ts';
import { encodeSnapshot } from '../src/game/reproducibility/snapshot.ts';

async function main(): Promise<void> {
  const path = process.argv[2];
  if (path === undefined || process.argv.length !== 3) {
    process.stderr.write('Usage: npm run --silent replay -- PATH\n');
    process.exitCode = 2;
    return;
  }
  try {
    const text = await readFile(path, 'utf8');
    const finalState = replayGame(text);
    if (finalState === null) throw new Error('Invalid replay.');
    process.stdout.write(`${encodeSnapshot(finalState)}\n`);
  } catch (error) {
    process.stderr.write(`${error instanceof Error ? error.message : 'Unable to read replay.'}\n`);
    process.exitCode = 1;
  }
}

void main();
