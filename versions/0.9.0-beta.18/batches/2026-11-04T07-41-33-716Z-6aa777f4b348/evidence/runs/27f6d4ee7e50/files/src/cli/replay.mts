import { open } from "node:fs/promises";
import { encodeSnapshot } from "../game/snapshot.ts";
import { MAX_REPLAY_BYTES, replayGame } from "../game/replay.ts";

async function readBoundedText(path: string): Promise<string | null> {
  const handle = await open(path, "r");
  try {
    const bytes = new Uint8Array(MAX_REPLAY_BYTES + 1);
    const result = await handle.read(bytes, 0, bytes.length, 0);
    if (result.bytesRead > MAX_REPLAY_BYTES) return null;
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes.subarray(0, result.bytesRead));
  } finally {
    await handle.close();
  }
}

async function main(): Promise<number> {
  const paths = process.argv.slice(2);
  if (paths.length !== 1) {
    process.stderr.write("Usage: npm run --silent replay -- PATH\n");
    return 2;
  }
  try {
    const text = await readBoundedText(paths[0] ?? "");
    if (text === null) {
      process.stderr.write("Invalid replay file.\n");
      return 1;
    }
    const state = replayGame(text);
    if (state === null) {
      process.stderr.write("Invalid replay file.\n");
      return 1;
    }
    process.stdout.write(`${encodeSnapshot(state)}\n`);
    return 0;
  } catch {
    process.stderr.write("Unable to read replay file.\n");
    return 1;
  }
}

const exitCode = await main();
if (exitCode !== 0) process.exitCode = exitCode;
