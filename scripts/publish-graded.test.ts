import assert from "node:assert/strict";
import { cp, mkdtemp, mkdir, readFile, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { copyGraded, GradedArtifactPrefix } from "./publish-graded.ts";

const line = (record: unknown) => `${JSON.stringify(record)}\n`;
const built = (id: string) => ({ id, pipelineStatus: "done", build: { passed: true } });
const check = (batch: string, id: string, runId: string, error: string | null, replacesAssessmentId: string | null = null) =>
  ({ id, kind: "checks", experimentId: batch, runId, replacesAssessmentId, error, outcomes: [{ status: error === null ? "pass" : "error" }] });

// r1 waits, because its only check ended in an error. r2 is already graded, so it doesn't.
async function published(root: string, batch: string): Promise<string> {
  const folder = join(root, "repository", "versions", "0.0.0", "batches", batch);
  await mkdir(join(folder, "assessments"), { recursive: true });
  await mkdir(join(folder, "evidence", "runs", "r1"), { recursive: true });
  await writeFile(join(folder, "runs.jsonl"), line(built("r1")) + line(built("r2")));
  await writeFile(join(folder, "experiment.json"), "{}\n");
  await writeFile(join(folder, "artifacts.json"), JSON.stringify([{ runId: "r1", assessmentId: null, path: "game.html" }]));
  await writeFile(join(folder, "evidence", "runs", "r1", "game.html"), "<!doctype html>");
  await writeFile(join(folder, "assessments", "checks.jsonl"), line(check(batch, "a1", "r1", "verifier failed")) + line(check(batch, "b1", "r2", null)));
  await writeFile(join(folder, "assessments", "judge.jsonl"), "");
  return folder;
}

test("grades add new checks of waiting runs, their listed evidence and artifact entries, and nothing else gets through", async () => {
  const root = await mkdtemp(join(tmpdir(), "results-graded-"));
  try {
    const batch = "b1", folder = `versions/0.0.0/batches/${batch}`, expected = [{ batch, folder }];
    const target = await published(root, batch), staging = join(root, "staging"), artifact = join(staging, `${GradedArtifactPrefix}${batch}`);
    const before = await readFile(join(target, "assessments", "checks.jsonl"), "utf8");
    const graded = async (change: (copy: string) => Promise<void>) => {
      await rm(artifact, { recursive: true, force: true });
      await cp(target, artifact, { recursive: true });
      await change(artifact);
      return copyGraded(staging, join(root, "repository"), expected);
    };
    const addCheck = (copy: string, record: unknown) => writeFile(join(copy, "assessments", "checks.jsonl"), before + line(record));
    const grade = async (copy: string) => {
      await addCheck(copy, check(batch, "a2", "r1", null, "a1"));
      await mkdir(join(copy, "evidence", "assessments", "a2"), { recursive: true });
      await writeFile(join(copy, "evidence", "assessments", "a2", "shot.png"), "png");
      await writeFile(join(copy, "artifacts.json"), JSON.stringify([{ runId: "r1", assessmentId: null, path: "game.html" }, { runId: "r1", assessmentId: "a2", path: "shot.png" }]));
    };
    const refused = [
      async (copy: string) => { await grade(copy); await writeFile(join(copy, "runs.jsonl"), line({ ...built("r1"), edited: true })); },
      async (copy: string) => { await writeFile(join(copy, "assessments", "checks.jsonl"), line(check(batch, "a9", "r1", null))); },
      async (copy: string) => { await addCheck(copy, check(batch, "a3", "r2", null)); },
      async (copy: string) => { await addCheck(copy, { ...check(batch, "a3", "r1", null), kind: "judge" }); },
      async (copy: string) => { await addCheck(copy, check(batch, "a3", "r1", null, "b1")); },
      async (copy: string) => { await addCheck(copy, check(batch, "../a3", "r1", null)); },
      async (copy: string) => { await writeFile(join(copy, "assessments", "judge.jsonl"), line({ id: "j1", kind: "judge", experimentId: batch, runId: "r1" })); },
      async (copy: string) => { await grade(copy); await writeFile(join(copy, "evidence", "assessments", "a2", "unlisted.txt"), "x"); },
      async (copy: string) => { await mkdir(join(copy, "scripts")); await writeFile(join(copy, "scripts", "index.ts"), ""); },
      async (copy: string) => { await rm(join(copy, "evidence", "runs", "r1", "game.html")); },
      async (copy: string) => { await writeFile(join(copy, ".gitattributes"), ""); },
    ];
    for (const change of refused) await assert.rejects(graded(change));
    await assert.rejects(copyGraded(staging, join(root, "repository"), [{ batch, folder: "scripts" }]));
    const linked = await graded(async (copy) => { await symlink(join(root, "outside"), join(copy, "link")); }).then(() => "copied", (error: unknown) => error);
    assert.notEqual(linked, "copied");
    assert.deepEqual(await graded(grade), [batch]);
    assert.equal(await readFile(join(target, "evidence", "assessments", "a2", "shot.png"), "utf8"), "png");
    assert.deepEqual(await copyGraded(staging, join(root, "repository"), [{ batch: "b2", folder: "versions/0.0.0/batches/b2" }]), []);
  } finally { await rm(root, { recursive: true, force: true }); }
});
