import { open } from 'node:fs/promises';
import { replayGame, REPLAY_MAX_BYTES } from '../src/game/replay.ts';
import { encodeSnapshot } from '../src/game/snapshot.ts';

async function run(): Promise<void> {
  const args = process.argv.slice(2);
  const path = args[0];
  if (args.length !== 1 || !path) throw new Error('Usage: npm run --silent replay -- PATH');
  const file = await open(path, 'r');
  let text: string;
  try {
    const bytes = Buffer.alloc(REPLAY_MAX_BYTES + 1);
    let length = 0;
    while (length < bytes.length) {
      const { bytesRead } = await file.read(bytes, length, bytes.length - length, length);
      if (bytesRead === 0) break;
      length += bytesRead;
    }
    if (length > REPLAY_MAX_BYTES) throw new Error('Replay exceeds the UTF-8 byte limit.');
    text = new TextDecoder('utf-8', { fatal: true }).decode(bytes.subarray(0, length));
  } finally {
    await file.close();
  }
  const state = replayGame(text);
  if (!state) throw new Error('Invalid replay.');
  process.stdout.write(`${encodeSnapshot(state)}\n`);
}

try {
  await run();
} catch (error: unknown) {
  process.stderr.write(`${error instanceof Error ? error.message : 'Unable to read replay.'}\n`);
  process.exitCode = 1;
}
