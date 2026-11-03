import assert from "node:assert/strict";
import { cp, mkdtemp, mkdir, readFile, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { copyGraded, GradedArtifactPrefix } from "./publish-graded.ts";

const line = (record: unknown) => `${JSON.stringify(record)}\n`;

async function published(root: string, batch: string): Promise<string> {
  const folder = join(root, "repository", "versions", "0.0.0", "batches", batch);
  await mkdir(join(folder, "assessments"), { recursive: true });
  await mkdir(join(folder, "evidence", "runs", "r1"), { recursive: true });
  await writeFile(join(folder, "runs.jsonl"), line({ id: "r1" }));
  await writeFile(join(folder, "experiment.json"), "{}\n");
  await writeFile(join(folder, "artifacts.json"), JSON.stringify([{ runId: "r1", assessmentId: null, path: "game.html" }]));
  await writeFile(join(folder, "evidence", "runs", "r1", "game.html"), "<!doctype html>");
  await writeFile(join(folder, "assessments", "checks.jsonl"), line({ id: "a1", experimentId: batch, runId: "r1" }));
  return folder;
}

test("grades add new assessments, their evidence and artifact entries to a published batch, and nothing else gets through", async () => {
  const root = await mkdtemp(join(tmpdir(), "results-graded-"));
  try {
    const batch = "b1", folder = `versions/0.0.0/batches/${batch}`, expected = [{ batch, folder }];
    const target = await published(root, batch), staging = join(root, "staging"), artifact = join(staging, `${GradedArtifactPrefix}${batch}`);
    const graded = async (change: (copy: string) => Promise<void>) => {
      await rm(artifact, { recursive: true, force: true });
      await cp(target, artifact, { recursive: true });
      await change(artifact);
      return copyGraded(staging, join(root, "repository"), expected);
    };
    const grade = async (copy: string) => {
      await writeFile(join(copy, "assessments", "checks.jsonl"), line({ id: "a1", experimentId: batch, runId: "r1" }) + line({ id: "a2", experimentId: batch, runId: "r1" }));
      await mkdir(join(copy, "evidence", "assessments", "a2"), { recursive: true });
      await writeFile(join(copy, "evidence", "assessments", "a2", "shot.png"), "png");
      await writeFile(join(copy, "artifacts.json"), JSON.stringify([{ runId: "r1", assessmentId: null, path: "game.html" }, { runId: "r1", assessmentId: "a2", path: "shot.png" }]));
    };
    await assert.rejects(graded(async (copy) => { await grade(copy); await writeFile(join(copy, "runs.jsonl"), line({ id: "r1", edited: true })); }));
    await assert.rejects(graded(async (copy) => { await writeFile(join(copy, "assessments", "checks.jsonl"), line({ id: "a9", experimentId: batch, runId: "r1" })); }));
    await assert.rejects(graded(async (copy) => { await writeFile(join(copy, "assessments", "checks.jsonl"), line({ id: "a1", experimentId: batch, runId: "r1" }) + line({ id: "a3", experimentId: batch, runId: "elsewhere" })); }));
    await assert.rejects(graded(async (copy) => { await mkdir(join(copy, "scripts")); await writeFile(join(copy, "scripts", "index.ts"), ""); }));
    await assert.rejects(graded(async (copy) => { await rm(join(copy, "evidence", "runs", "r1", "game.html")); }));
    await assert.rejects(graded(async (copy) => { await writeFile(join(copy, ".gitattributes"), ""); }));
    await assert.rejects(copyGraded(staging, join(root, "repository"), [{ batch, folder: "scripts" }]));
    const linked = await graded(async (copy) => { await symlink(join(root, "outside"), join(copy, "link")); }).then(() => "copied", (error: unknown) => error);
    assert.notEqual(linked, "copied");
    assert.deepEqual(await graded(grade), [batch]);
    assert.equal(await readFile(join(target, "evidence", "assessments", "a2", "shot.png"), "utf8"), "png");
    assert.deepEqual(await copyGraded(staging, join(root, "repository"), [{ batch: "b2", folder: "versions/0.0.0/batches/b2" }]), []);
  } finally { await rm(root, { recursive: true, force: true }); }
});
