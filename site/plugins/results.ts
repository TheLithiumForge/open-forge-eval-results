import { mkdir, writeFile } from "node:fs/promises";
import { join, dirname } from "node:path";
import { createHash } from "node:crypto";
import type { LoadContext, Plugin } from "@docusaurus/types";
import { readRepository, RecordFiles, AssessmentKinds } from "../../scripts/read.ts";
import { validateReferences } from "../../scripts/references.ts";
import type { Batch } from "../data/records.types.ts";
import type { CatalogueEntry, PageData } from "../data/pages.types.ts";
import { AnalysisVersion, latestRun } from "../data/analysis.ts";
import { summaries } from "../data/summaries.ts";

export const ResultsPluginName = "open-forge-results";
export default function results(context: LoadContext): Plugin<Batch[]> {
  let loaded: Batch[] = [];
  return {
    name: ResultsPluginName,
    configureWebpack() {
      // Docusaurus generates mixed ESM and require calls in its route registry.
      return { module: { rules: [{ test: /\.js$/, include: context.generatedFilesDir, type: "javascript/auto" }] } };
    },
    async loadContent() {
      loaded = await readRepository(dirname(context.siteDir));
      for (const batch of loaded) validateReferences(batch);
      return loaded;
    },
    async contentLoaded({ content, actions }) {
      const commit = process.env["RESULTS_DATA_COMMIT"] ?? process.env["GITHUB_SHA"] ?? "unpublished workspace";
      const stamp = { commit, analysis: AnalysisVersion };
      const route = (batch: Batch) => `/batches/${batch.experiment.cliVersion}/${batch.experiment.id}`;
      const catalogue: CatalogueEntry[] = content.map((batch) => ({ version: batch.experiment.cliVersion ?? "unknown", id: batch.experiment.id,
        at: batch.experiment.createdAt, path: route(batch), scoring: batch.experiment.config.isolation !== "local" }));
      actions.setGlobalData({ catalogue });
      const add = async (path: string, data: PageData) => {
        const name = `${createHash("sha256").update(path).digest("hex")}.json`;
        await actions.createData(name, JSON.stringify(data));
        actions.addRoute({ path: `${context.baseUrl.replace(/\/$/, "")}${path}`, component: "@site/src/components/ResultsPage.tsx", exact: true, modules: { data: `@generated/${ResultsPluginName}/default/${name}` } });
      };
      const rows = content.flatMap(summaries);
      await add("/", { ...stamp, title: "Evaluation results", mode: "overview", catalogue });
      await add("/cli-history", { ...stamp, title: "CLI history", mode: "cli", summaries: rows });
      await add("/model-history", { ...stamp, title: "Model history", mode: "model", summaries: rows });
      for (const batch of content) {
        const recordUrl = `/records/${batch.experiment.cliVersion}/${batch.experiment.id}`;
        const index = { experiment: { cliVersion: batch.experiment.cliVersion, config: { isolation: batch.experiment.config.isolation } },
          runs: batch.runs.map(({ id, batchId, setup, repeat, pipelineStatus }) => ({ id, batchId, setup, repeat, pipelineStatus })) };
        await add(route(batch), { ...stamp, title: `Batch ${batch.experiment.id}`, mode: "batch", batch: index, summaries: summaries(batch), recordUrl });
        for (const run of batch.runs) await add(`${route(batch)}/runs/${run.id}`, { ...stamp, title: `Attempt ${run.repeat}`, mode: "run", run: latestRun(run, batch.assessments), recordUrl, scoring: batch.experiment.config.isolation !== "local" });
      }
    },
    async postBuild({ outDir }) {
      for (const batch of loaded) {
        const folder = join(outDir, "records", batch.experiment.cliVersion ?? "unknown", batch.experiment.id);
        await mkdir(join(folder, "assessments"), { recursive: true });
        const jsonl = (items: readonly unknown[]) => items.map((item) => JSON.stringify(item) + "\n").join("");
        await writeFile(join(folder, RecordFiles.experiment), JSON.stringify(batch.experiment));
        await writeFile(join(folder, RecordFiles.setups), jsonl(batch.setups));
        await writeFile(join(folder, RecordFiles.runs), jsonl(batch.runs));
        await writeFile(join(folder, RecordFiles.artifacts), JSON.stringify(batch.artifacts));
        for (const kind of AssessmentKinds) await writeFile(join(folder, "assessments", `${kind}.jsonl`), jsonl(batch.assessments.filter((assessment) => assessment.kind === kind)));
      }
    },
  };
}
