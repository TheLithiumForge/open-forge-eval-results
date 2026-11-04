import { readFileSync } from "node:fs";
import { encodeSnapshot } from "../src/game/snapshot.ts";
import { replayGame } from "../src/game/replay.ts";

try {
  const path = process.argv[2];
  if (!path || process.argv.length !== 3) throw new Error("Expected one replay path.");
  const bytes = readFileSync(path);
  const text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  const finalState = replayGame(text);
  if (!finalState) throw new Error("Invalid replay.");
  process.stdout.write(encodeSnapshot(finalState) + "\n");
} catch {
  process.stderr.write("Invalid replay.\n");
  process.exitCode = 1;
}
