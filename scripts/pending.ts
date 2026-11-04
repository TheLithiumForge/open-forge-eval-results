import { existsSync } from "node:fs";
import { appendFile, readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { RecordFiles } from "./catalogue.ts";

/** One built run that still waits for a check without errors, which one CI job grades. */
export interface PendingRun { readonly batch: string; readonly folder: string; readonly run: string }
/** GitHub runs at most 256 jobs from one matrix, so later runs wait for the next grading. */
export const MatrixLimit = 256;

interface PublishedRun { readonly id: string; readonly pipelineStatus: string; readonly build: { readonly passed: boolean } | null }
interface PublishedCheck { readonly runId: string; readonly error: string | null; readonly outcomes: readonly { readonly status: string }[] }

const RecordId = /^[A-Za-z0-9][A-Za-z0-9_.-]*$/;

async function lines<T>(path: string): Promise<T[]> {
  if (!existsSync(path)) return [];
  return (await readFile(path, "utf8")).split("\n").filter((line) => line.trim() !== "").map((line) => JSON.parse(line) as T);
}

/** The same rule as the eval CLI's check --missing: the latest check graded something and ended in no error. */
function checked(assessment: PublishedCheck | undefined): boolean {
  return assessment !== undefined && assessment.error === null && assessment.outcomes.some((outcome) => outcome.status !== "blocked")
    && assessment.outcomes.every((outcome) => outcome.status !== "error");
}

/** A published batch's built runs whose latest check graded nothing or ended in an error, by run ID. */
export async function waitingRuns(folder: string): Promise<Set<string>> {
  const latest = new Map<string, PublishedCheck>();
  for (const check of await lines<PublishedCheck>(join(folder, "assessments", "checks.jsonl"))) latest.set(check.runId, check);
  const runs = await lines<PublishedRun>(join(folder, RecordFiles.runs));
  return new Set(runs.filter((run) => run.pipelineStatus === "done" && run.build?.passed === true && !checked(latest.get(run.id)) && RecordId.test(run.id)).map((run) => run.id));
}

/** Every waiting run of every published batch, in folder and run order, up to the matrix limit. */
export async function pendingRuns(root: string, limit: number = MatrixLimit): Promise<PendingRun[]> {
  const found: PendingRun[] = [];
  const versions = join(root, "versions");
  for (const version of existsSync(versions) ? (await readdir(versions, { withFileTypes: true })).filter((entry) => entry.isDirectory() && RecordId.test(entry.name)).map((entry) => entry.name).sort() : []) {
    const batches = join(versions, version, "batches");
    if (!existsSync(batches)) continue;
    // Batch names reach runner commands and artifact names, so only names in the records' ID form count.
    for (const batch of (await readdir(batches)).sort().filter((name) => RecordId.test(name))) {
      const folder = ["versions", version, "batches", batch].join("/");
      for (const run of [...await waitingRuns(join(batches, batch))].sort()) found.push({ batch, folder, run });
    }
  }
  return found.slice(0, limit);
}

if (import.meta.main) {
  const pending = await pendingRuns(process.cwd());
  const output = process.env["GITHUB_OUTPUT"];
  const text = `matrix=${JSON.stringify(pending)}\nany=${pending.length > 0}\n`;
  if (output === undefined) process.stdout.write(text);
  else await appendFile(output, text);
}
