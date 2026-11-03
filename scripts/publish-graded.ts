import { existsSync } from "node:fs";
import { copyFile, lstat, mkdir, readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import type { PendingBatch } from "./pending.ts";

/**
 * Copies grades from CI artifacts into published batches. The grading jobs built agent-written code, so nothing in an
 * artifact is trusted. Only batch folders the plan job expected are read, and each is compared with the batch already
 * published here: records and run evidence stay byte for byte, assessment files only grow with assessments of the
 * batch's own runs, new evidence and artifact entries belong to those assessments, and nothing is deleted.
 */
export const GradedArtifactPrefix = "graded-";
const BatchFolder = /^versions\/[A-Za-z0-9][A-Za-z0-9_.-]*\/batches\/([A-Za-z0-9][A-Za-z0-9_.-]*)$/;
const AssessmentFile = /^assessments\/[a-z]+\.jsonl$/;
const AssessmentEvidence = /^evidence\/assessments\/([A-Za-z0-9][A-Za-z0-9_.-]*)\//;
const ArtifactsFile = "artifacts.json";

/** Every plain file under a folder, as paths relative to it. A link, a special file or a dot-named entry stops the copy. */
async function plainFiles(folder: string, prefix = ""): Promise<string[]> {
  const files: string[] = [];
  for (const entry of await readdir(join(folder, prefix), { withFileTypes: true })) {
    const path = prefix === "" ? entry.name : `${prefix}/${entry.name}`;
    const stats = await lstat(join(folder, path));
    if (entry.name.startsWith(".") || stats.isSymbolicLink() || !(stats.isFile() || stats.isDirectory())) throw new Error(`A graded artifact holds a link, special file or dot-named entry: ${path}`);
    if (stats.isDirectory()) files.push(...await plainFiles(folder, path));
    else files.push(path);
  }
  return files;
}

type Record = { readonly [key: string]: unknown };
const parsed = (text: string): Record[] => text.split("\n").filter((line) => line.trim() !== "").map((line) => {
  const value: unknown = JSON.parse(line);
  if (value === null || typeof value !== "object" || Array.isArray(value)) throw new Error("A graded record line isn't an object.");
  return value as Record;
});
const runIdsOf = (record: Record): unknown[] => record["kind"] === "pick"
  ? [(record["left"] as Record | undefined)?.["runId"], (record["right"] as Record | undefined)?.["runId"]] : [record["runId"]];

/** The files a graded copy of one published batch may add or change, after checking every rule above. */
async function gradedChanges(source: string, target: string, batch: string): Promise<string[]> {
  const graded = await plainFiles(source), published = await plainFiles(target);
  for (const file of published) if (!graded.includes(file)) throw new Error(`A graded batch may not delete ${file}.`);
  const read = async (folder: string, file: string) => readFile(join(folder, ...file.split("/")));
  const runs = new Set(parsed((await read(target, "runs.jsonl")).toString("utf8")).map((run) => run["id"]));
  const known = new Set<unknown>(), added = new Set<unknown>();
  for (const file of published.filter((path) => AssessmentFile.test(path))) for (const record of parsed((await read(target, file)).toString("utf8"))) known.add(record["id"]);
  const changed: string[] = [];
  for (const file of graded.filter((path) => AssessmentFile.test(path))) {
    const after = await read(source, file), before = published.includes(file) ? await read(target, file) : Buffer.alloc(0);
    if (!after.subarray(0, before.length).equals(before)) throw new Error(`${file} may only grow.`);
    for (const record of parsed(after.subarray(before.length).toString("utf8"))) {
      if (record["experimentId"] !== batch || known.has(record["id"]) || added.has(record["id"]) || runIdsOf(record).some((id) => !runs.has(id))) throw new Error(`${file} adds an assessment that isn't new or isn't of this batch's runs.`);
      added.add(record["id"]);
    }
    if (after.length > before.length) changed.push(file);
  }
  for (const file of graded.filter((path) => !AssessmentFile.test(path))) {
    const after = await read(source, file), before = published.includes(file) ? await read(target, file) : null;
    if (file === ArtifactsFile && before !== null) {
      const earlier = new Set((JSON.parse(before.toString("utf8")) as unknown[]).map((item) => JSON.stringify(item)));
      const later = JSON.parse(after.toString("utf8")) as Record[];
      const kept = new Set(later.map((item) => JSON.stringify(item)));
      if ([...earlier].some((item) => !kept.has(item)) || later.some((item) => !earlier.has(JSON.stringify(item)) && !added.has(item["assessmentId"]))) throw new Error(`${ArtifactsFile} may only add entries of new assessments.`);
      if (!after.equals(before)) changed.push(file);
      continue;
    }
    if (before !== null) {
      if (!after.equals(before)) throw new Error(`A graded batch may not change ${file}.`);
      continue;
    }
    if (!added.has(AssessmentEvidence.exec(file)?.[1])) throw new Error(`A graded batch may not add ${file}.`);
    changed.push(file);
  }
  return changed;
}

/** Adds each expected batch's grades to its published copy and returns the batches graded. A job that failed leaves no artifact and is skipped. */
export async function copyGraded(staging: string, root: string, expected: readonly Pick<PendingBatch, "batch" | "folder">[]): Promise<string[]> {
  const copied: string[] = [];
  for (const item of expected) {
    if (BatchFolder.exec(item.folder)?.[1] !== item.batch) throw new Error(`Unexpected batch folder ${item.folder}.`);
    const source = join(staging, `${GradedArtifactPrefix}${item.batch}`), target = join(root, ...item.folder.split("/"));
    if (!existsSync(source)) continue;
    if (!existsSync(target)) throw new Error(`${item.folder} isn't published here, so it can't take grades.`);
    for (const file of await gradedChanges(source, target, item.batch)) {
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
  process.stdout.write(`Copied grades for ${copied.length} batch${copied.length === 1 ? "" : "es"}.\n`);
}
