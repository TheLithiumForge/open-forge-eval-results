import { readFile } from "node:fs/promises";
import { replayGame } from "./replay.ts";
import { encodeSnapshot } from "./snapshot.ts";

async function run(): Promise<void> {
  const path = process.argv[2];
  if (path === undefined || process.argv.length !== 3) {
    process.stderr.write("Invalid replay file.\n");
    process.exitCode = 1;
    return;
  }
  try {
    const text = await readFile(path, "utf8");
    const state = replayGame(text);
    if (state === null) throw new Error("Invalid replay");
    process.stdout.write(`${encodeSnapshot(state)}\n`);
  } catch {
    process.stderr.write("Invalid replay file.\n");
    process.exitCode = 1;
  }
}

await run();
