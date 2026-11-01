import type { AssessedRun } from "./analysis.ts";
import type { Run } from "./records.types.ts";
import type { Summary } from "./summaries.ts";
export interface CatalogueEntry { readonly version: string; readonly id: string; readonly at: string; readonly path: string; readonly scoring: boolean }
export interface PageData {
  readonly title: string; readonly mode: "overview" | "cli" | "model" | "batch" | "run";
  readonly commit: string; readonly analysis: string; readonly catalogue?: readonly CatalogueEntry[]; readonly summaries?: readonly Summary[];
  readonly batch?: { readonly experiment: { readonly cliVersion: string | null; readonly config: { readonly isolation: string } };
    readonly runs: readonly Pick<Run, "id" | "batchId" | "setup" | "repeat" | "pipelineStatus">[] };
  readonly run?: AssessedRun; readonly recordUrl?: string;
  readonly scoring?: boolean;
}
