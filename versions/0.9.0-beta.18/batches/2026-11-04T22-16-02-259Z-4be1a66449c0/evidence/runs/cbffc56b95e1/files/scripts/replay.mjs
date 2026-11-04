import { readFile } from "node:fs/promises";
import { replayGame } from "../src/game/replay.ts";
import { encodeSnapshot } from "../src/game/snapshot.ts";

try {
  const path = process.argv[2];
  if (path === undefined || process.argv.length !== 3) throw new Error("Usage: npm run --silent replay -- PATH");
  const text = await readFile(path, "utf8");
  const result = replayGame(text);
  if (result === null) throw new Error("Invalid replay.");
  process.stdout.write(`${encodeSnapshot(result)}\n`);
} catch (error) {
  process.stderr.write(`${error instanceof Error ? error.message : "Unable to read replay."}\n`);
  process.exitCode = 1;
}
