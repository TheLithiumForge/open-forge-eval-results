import { existsSync } from "node:fs";
import { appendFile, readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { RecordFiles } from "./catalogue.ts";

/** A published batch with built runs that still wait for a check without errors, and the CI runner that grades it. */
export interface PendingBatch { readonly batch: string; readonly folder: string; readonly waiting: number; readonly runner: unknown }

interface PublishedRun { readonly id: string; readonly pipelineStatus: string; readonly build: { readonly passed: boolean } | null }
interface PublishedCheck { readonly runId: string; readonly error: string | null; readonly outcomes: readonly { readonly status: string }[] }

async function lines<T>(path: string): Promise<T[]> {
  if (!existsSync(path)) return [];
  return (await readFile(path, "utf8")).split("\n").filter((line) => line.trim() !== "").map((line) => JSON.parse(line) as T);
}

/** The same rule as the eval CLI's check --missing: the latest check graded something and ended in no error. */
function checked(assessment: PublishedCheck | undefined): boolean {
  return assessment !== undefined && assessment.error === null && assessment.outcomes.some((outcome) => outcome.status !== "blocked")
    && assessment.outcomes.every((outcome) => outcome.status !== "error");
}

/** Every published batch with waiting runs, in folder order, handed round robin to the runners so each pool takes a share. */
export async function pendingBatches(root: string, runners: readonly unknown[]): Promise<PendingBatch[]> {
  if (runners.length === 0) throw new Error("Name at least one runner.");
  const found: Omit<PendingBatch, "runner">[] = [];
  const versions = join(root, "versions");
  for (const version of existsSync(versions) ? (await readdir(versions, { withFileTypes: true })).filter((entry) => entry.isDirectory()).map((entry) => entry.name).sort() : []) {
    const batches = join(versions, version, "batches");
    if (!existsSync(batches)) continue;
    for (const batch of (await readdir(batches)).sort()) {
      const folder = join(batches, batch);
      const latest = new Map<string, PublishedCheck>();
      for (const check of await lines<PublishedCheck>(join(folder, "assessments", "checks.jsonl"))) latest.set(check.runId, check);
      const waiting = (await lines<PublishedRun>(join(folder, RecordFiles.runs))).filter((run) => run.pipelineStatus === "done" && run.build?.passed === true && !checked(latest.get(run.id)));
      if (waiting.length > 0) found.push({ batch, folder: ["versions", version, "batches", batch].join("/"), waiting: waiting.length });
    }
  }
  return found.map((item, index) => ({ ...item, runner: runners[index % runners.length] }));
}

if (import.meta.main) {
  // GRADE_RUNNERS holds a JSON list of runs-on values, such as "ubuntu-latest" or ["self-hosted", "Windows"].
  const runners: unknown = JSON.parse(process.env["GRADE_RUNNERS"] ?? '["ubuntu-latest"]');
  if (!Array.isArray(runners)) throw new Error("GRADE_RUNNERS must be a JSON list.");
  const pending = await pendingBatches(process.cwd(), runners);
  const output = process.env["GITHUB_OUTPUT"];
  const text = `matrix=${JSON.stringify(pending)}\nany=${pending.length > 0}\n`;
  if (output === undefined) process.stdout.write(text);
  else await appendFile(output, text);
}
