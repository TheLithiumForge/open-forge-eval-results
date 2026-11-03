import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { mkdtemp, mkdir, readFile, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { copyGraded, GradedArtifactPrefix } from "./publish-graded.ts";

test("only expected batch folders of plain files replace their published copies, and links or foreign folders stop the copy", async () => {
  const root = await mkdtemp(join(tmpdir(), "results-graded-"));
  try {
    const staging = join(root, "staging"), repository = join(root, "repository");
    const batch = "b1", folder = `versions/0.0.0/batches/${batch}`, missing = "b2";
    const artifact = join(staging, `${GradedArtifactPrefix}${batch}`);
    await mkdir(join(artifact, "assessments"), { recursive: true });
    await writeFile(join(artifact, "assessments", "checks.jsonl"), "{}\n");
    await mkdir(join(repository, ...folder.split("/")), { recursive: true });
    await writeFile(join(repository, ...folder.split("/"), "stale.json"), "{}");
    const copied = await copyGraded(staging, repository, [{ batch, folder }, { batch: missing, folder: `versions/0.0.0/batches/${missing}` }]);
    assert.deepEqual(copied, [batch]);
    assert.equal(await readFile(join(repository, ...folder.split("/"), "assessments", "checks.jsonl"), "utf8"), "{}\n");
    assert.equal(existsSync(join(repository, ...folder.split("/"), "stale.json")), false);
    await assert.rejects(copyGraded(staging, repository, [{ batch, folder: "scripts" }]));
    await assert.rejects(copyGraded(staging, repository, [{ batch, folder: `versions/0.0.0/batches/${missing}` }]));
    const linked = await symlink(join(repository, "outside"), join(artifact, "link")).then(() => true, () => false);
    if (linked) await assert.rejects(copyGraded(staging, repository, [{ batch, folder }]));
  } finally { await rm(root, { recursive: true, force: true }); }
});
