import assert from "node:assert/strict";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { RecordFiles } from "./catalogue.ts";
import { pendingBatches } from "./pending.ts";

const jsonl = (records: readonly unknown[]) => records.map((record) => `${JSON.stringify(record)}\n`).join("");
const built = (id: string) => ({ id, pipelineStatus: "done", build: { passed: true } });
const check = (runId: string, status: string) => ({ runId, error: null, outcomes: [{ status }] });

test("built runs without a check free of errors make their batch pending, and runners take the batches in turn", async () => {
  const root = await mkdtemp(join(tmpdir(), "results-pending-"));
  try {
    const batches = join(root, "versions", "0.0.0", "batches");
    const write = async (batch: string, runs: readonly unknown[], checks: readonly unknown[]) => {
      await mkdir(join(batches, batch, "assessments"), { recursive: true });
      await writeFile(join(batches, batch, RecordFiles.runs), jsonl(runs));
      await writeFile(join(batches, batch, "assessments", "checks.jsonl"), jsonl(checks));
    };
    const graded = "a-graded", unchecked = "b-unchecked", errored = "c-errored";
    await write(graded, [built("r1"), { ...built("r2"), build: { passed: false } }, { ...built("r3"), pipelineStatus: "failed" }], [check("r1", "pass")]);
    await write(unchecked, [built("r4"), built("r5")], [check("r4", "pass")]);
    await write(errored, [built("r6")], [check("r6", "pass"), check("r6", "error")]);
    const runners = ["first", "second"];
    const pending = await pendingBatches(root, runners);
    assert.deepEqual(pending.map((item) => [item.batch, item.waiting, item.runner]), [[unchecked, 1, runners[0]], [errored, 1, runners[1]]]);
    assert.ok(pending.every((item) => item.folder.endsWith(item.batch)));
    assert.deepEqual(await pendingBatches(join(root, "missing"), runners), []);
    await assert.rejects(pendingBatches(root, []));
  } finally { await rm(root, { recursive: true, force: true }); }
});
