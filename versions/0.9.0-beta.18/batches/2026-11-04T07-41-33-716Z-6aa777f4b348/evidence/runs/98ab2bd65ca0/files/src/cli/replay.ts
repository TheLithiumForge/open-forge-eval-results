import { readFile } from "node:fs/promises";
import { encodeSnapshot } from "../game/snapshot.ts";
import { replayGame } from "../game/replay.ts";

async function main(): Promise<void> {
  const [path, ...extra] = process.argv.slice(2);
  if (path === undefined || extra.length > 0) {
    process.stderr.write("Usage: npm run --silent replay -- PATH\n");
    process.exitCode = 1;
    return;
  }

  let text: string;
  try {
    text = await readFile(path, "utf8");
  } catch {
    process.stderr.write("Unable to read replay file.\n");
    process.exitCode = 1;
    return;
  }

  const result = replayGame(text);
  if (result === null) {
    process.stderr.write("Invalid replay file.\n");
    process.exitCode = 1;
    return;
  }

  process.stdout.write(`${encodeSnapshot(result)}\n`);
}

await main();
