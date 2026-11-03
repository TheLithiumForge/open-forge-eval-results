import { existsSync } from "node:fs";
import { copyFile, lstat, mkdir, readdir, rm } from "node:fs/promises";
import { join } from "node:path";
import type { PendingBatch } from "./pending.ts";

/**
 * Copies graded batch folders from CI artifacts into versions/. The grading jobs built agent-written code, so nothing
 * in an artifact is trusted: only the batch folders the plan job expected are read, only plain files and folders are
 * copied, and every expected folder must name its own batch.
 */
export const GradedArtifactPrefix = "graded-";
const BatchFolder = /^versions\/[A-Za-z0-9][A-Za-z0-9_.-]*\/batches\/([A-Za-z0-9][A-Za-z0-9_.-]*)$/;

/** Every plain file under a folder, as paths relative to it. A link or any other kind of entry stops the copy. */
async function plainFiles(folder: string, prefix = ""): Promise<string[]> {
  const files: string[] = [];
  for (const entry of await readdir(join(folder, prefix), { withFileTypes: true })) {
    const path = prefix === "" ? entry.name : `${prefix}/${entry.name}`;
    const stats = await lstat(join(folder, path));
    if (stats.isSymbolicLink() || !(stats.isFile() || stats.isDirectory())) throw new Error(`A graded artifact holds a link or special file: ${path}`);
    if (stats.isDirectory()) files.push(...await plainFiles(folder, path));
    else files.push(path);
  }
  return files;
}

/** Replaces each expected batch folder with its graded copy and returns the batches copied. A job that failed leaves no artifact and is skipped. */
export async function copyGraded(staging: string, root: string, expected: readonly Pick<PendingBatch, "batch" | "folder">[]): Promise<string[]> {
  const copied: string[] = [];
  for (const item of expected) {
    const match = BatchFolder.exec(item.folder);
    if (match?.[1] !== item.batch) throw new Error(`Unexpected batch folder ${item.folder}.`);
    const source = join(staging, `${GradedArtifactPrefix}${item.batch}`);
    if (!existsSync(source)) continue;
    const files = await plainFiles(source);
    const target = join(root, ...item.folder.split("/"));
    await rm(target, { recursive: true, force: true });
    for (const file of files) {
      await mkdir(join(target, ...file.split("/").slice(0, -1)), { recursive: true });
      await copyFile(join(source, ...file.split("/")), join(target, ...file.split("/")));
    }
    copied.push(item.batch);
  }
  return copied;
}

if (import.meta.main) {
  const [staging] = process.argv.slice(2);
  // GRADED is the plan job's matrix, computed from this repository before any agent code ran.
  const expected: unknown = JSON.parse(process.env["GRADED"] ?? "[]");
  if (staging === undefined || !Array.isArray(expected)) throw new Error("Name the artifact folder and set GRADED to the plan job's matrix.");
  const copied = await copyGraded(staging, process.cwd(), expected as PendingBatch[]);
  process.stdout.write(`Copied ${copied.length} graded batch${copied.length === 1 ? "" : "es"}.\n`);
}
