import assert from "node:assert/strict";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { RecordFiles } from "./catalogue.ts";
import { pendingRuns } from "./pending.ts";

const jsonl = (records: readonly unknown[]) => records.map((record) => `${JSON.stringify(record)}\n`).join("");
const built = (id: string) => ({ id, pipelineStatus: "done", build: { passed: true } });
const check = (runId: string, status: string) => ({ runId, error: null, outcomes: [{ status }] });

test("each built run without a check free of errors becomes one grading job, in folder and run order, up to the limit", async () => {
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
    await write(unchecked, [built("r4"), built("r5"), built("r6")], [check("r4", "pass")]);
    await write(errored, [built("r7")], [check("r7", "pass"), check("r7", "error")]);
    const pending = await pendingRuns(root);
    assert.deepEqual(pending.map((item) => [item.batch, item.run]), [[unchecked, "r5"], [unchecked, "r6"], [errored, "r7"]]);
    assert.ok(pending.every((item) => item.folder.endsWith(item.batch)));
    assert.equal((await pendingRuns(root, 2)).length, 2);
    assert.deepEqual(await pendingRuns(join(root, "missing")), []);
  } finally { await rm(root, { recursive: true, force: true }); }
});
